"""
InsiteIQ v1 Modo 1 — TicketThread routes (Decision #8: WhatsApp kill from day 1)

Endpoints (all scoped to a specific work_order):
  GET    /api/work-orders/{wo_id}/threads                    — list threads visible to user
  GET    /api/work-orders/{wo_id}/threads/{kind}             — get thread (shared|internal)
  POST   /api/work-orders/{wo_id}/threads/{kind}/messages    — post message (lazy-creates thread)
  GET    /api/work-orders/{wo_id}/threads/{kind}/messages    — list messages (paginated)

Lazy creation:
  Threads don't exist until the first message is posted. The POST endpoint
  creates the thread on-demand with the right participants derived from the
  work_order. Cheaper + simpler than eager creation.

RBAC:
  - shared thread: srs_coordinators OR (tech_field AND assigned_tech) OR
    (client_coordinator AND same org)
  - internal thread: srs_coordinators only, tenant-wide

Sealing:
  Threads seal when the parent work_order closes/cancels (see work_orders.py
  _seal_threads hook). A sealed thread refuses new messages (HTTP 409).
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.ticket_thread import MessageAttachment, MessageKind, ThreadKind

router = APIRouter(prefix="/work-orders/{wo_id}/threads", tags=["ticket_threads"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------- Bodies ----------------

class PostMessageBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str | None = None
    attachments: list[MessageAttachment] = Field(default_factory=list)
    mentions: list[str] = Field(default_factory=list)
    kind: Literal["message", "evidence"] = "message"


# ---------------- Helpers ----------------

async def _load_wo(db, wo_id: str, user: CurrentUser) -> dict:
    """Load work_order with scope enforcement."""
    try:
        oid = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid work_order id")

    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}

    # Same scoping as work_orders route (SRS sees all; tech sees assigned; client sees own org)
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if m and m.get("organization_id"):
                q["organization_id"] = m["organization_id"]
            else:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
        elif user.has_space("tech_field"):
            q["assigned_tech_user_id"] = user.user_id
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")

    wo = await db.work_orders.find_one(q)
    if not wo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
    return wo


def _can_see_thread(user: CurrentUser, thread_kind: ThreadKind, wo: dict) -> bool:
    if thread_kind == "internal":
        return user.has_space("srs_coordinators")
    # shared
    if user.has_space("srs_coordinators"):
        return True
    if user.has_space("tech_field") and wo.get("assigned_tech_user_id") == user.user_id:
        return True
    if user.has_space("client_coordinator"):
        m = user.membership_in("client_coordinator")
        if m and m.get("organization_id") == wo.get("organization_id"):
            return True
    return False


def _derive_shared_participants(wo: dict) -> list[dict]:
    """Compute participants for a shared thread from the work_order."""
    now = _now()
    seen = set()
    out: list[dict] = []

    def add(user_id: str | None, role: str):
        if user_id and user_id not in seen:
            seen.add(user_id)
            out.append({"user_id": user_id, "role": role, "added_at": now})

    add(wo.get("srs_coordinator_user_id"), "srs_coordinator")
    add(wo.get("assigned_tech_user_id"), "tech_assigned")
    add(wo.get("noc_operator_user_id"), "noc_operator")
    add(wo.get("onsite_resident_user_id"), "onsite_resident")
    return out


async def _get_or_create_thread(db, wo: dict, kind: ThreadKind, creator_user_id: str) -> dict:
    """Lazy thread creation — first message triggers it."""
    existing = await db.ticket_threads.find_one(
        {"work_order_id": str(wo["_id"]), "kind": kind, "tenant_id": wo["tenant_id"]}
    )
    if existing:
        return existing

    now = _now()
    participants = _derive_shared_participants(wo) if kind == "shared" else []
    if kind == "internal":
        # Internal threads seeded with the SRS coordinator on the WO + creator
        srs_coord = wo.get("srs_coordinator_user_id")
        if srs_coord:
            participants.append({
                "user_id": srs_coord, "role": "srs_coordinator", "added_at": now,
            })
        if creator_user_id and creator_user_id != srs_coord:
            participants.append({
                "user_id": creator_user_id, "role": "srs_coordinator", "added_at": now,
            })

    doc = {
        "tenant_id": wo["tenant_id"],
        "work_order_id": str(wo["_id"]),
        "kind": kind,
        "participants": participants,
        "sealed_at": None,
        "organization_id": wo.get("organization_id"),
        "site_id": wo.get("site_id"),
        "work_order_reference": wo.get("reference"),
        "created_at": now,
        "updated_at": now,
        "created_by": creator_user_id,
        "updated_by": creator_user_id,
    }
    result = await db.ticket_threads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ---------------- Endpoints ----------------

@router.get("")
async def list_threads(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    threads = await db.ticket_threads.find(
        {"work_order_id": str(wo["_id"]), "tenant_id": user.tenant_id}
    ).to_list(10)

    # Filter by visibility
    visible = [t for t in threads if _can_see_thread(user, t["kind"], wo)]
    return [_serialize(t) for t in visible]


@router.get("/{kind}")
async def get_thread(
    wo_id: str, kind: ThreadKind, user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    if not _can_see_thread(user, kind, wo):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Cannot read {kind} thread")

    thread = await db.ticket_threads.find_one(
        {"work_order_id": str(wo["_id"]), "kind": kind, "tenant_id": user.tenant_id}
    )
    if not thread:
        # Respond with empty skeleton (not yet created)
        return {
            "exists": False,
            "work_order_id": wo_id,
            "kind": kind,
            "sealed_at": None,
            "participants": _derive_shared_participants(wo) if kind == "shared" else [],
        }
    return {"exists": True, **_serialize(thread)}


@router.get("/{kind}/messages")
async def list_messages(
    wo_id: str,
    kind: ThreadKind,
    limit: int = 200,
    since: str | None = None,  # ISO datetime to paginate from
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    if not _can_see_thread(user, kind, wo):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Cannot read {kind} thread")

    thread = await db.ticket_threads.find_one(
        {"work_order_id": str(wo["_id"]), "kind": kind, "tenant_id": user.tenant_id}
    )
    if not thread:
        return []

    q: dict[str, Any] = {"thread_id": str(thread["_id"]), "tenant_id": user.tenant_id}
    if since:
        try:
            q["ts"] = {"$gt": datetime.fromisoformat(since)}
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid 'since' ISO datetime")

    msgs = (
        await db.ticket_messages.find(q)
        .sort("ts", 1)
        .limit(min(limit, 1000))
        .to_list(None)
    )
    return [_serialize(m) for m in msgs]


@router.post("/{kind}/messages", status_code=status.HTTP_201_CREATED)
async def post_message(
    wo_id: str,
    kind: ThreadKind,
    body: PostMessageBody,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    if not _can_see_thread(user, kind, wo):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Cannot post to {kind} thread")

    if body.text is None and not body.attachments:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Message needs text or attachments")

    # Create thread lazily if needed
    thread = await _get_or_create_thread(db, wo, kind, user.user_id)

    if thread.get("sealed_at"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Thread is sealed (work_order closed) — messages immutable",
        )

    now = _now()
    msg = {
        "tenant_id": user.tenant_id,
        "thread_id": str(thread["_id"]),
        "work_order_id": str(wo["_id"]),
        "kind": body.kind,
        "actor_user_id": user.user_id,
        "ts": now,
        "text": body.text,
        "attachments": [a.model_dump() for a in body.attachments],
        "mentions": body.mentions,
        "payload": {},
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.ticket_messages.insert_one(msg)
    msg["_id"] = result.inserted_id

    # Bump thread updated_at
    await db.ticket_threads.update_one(
        {"_id": thread["_id"]},
        {"$set": {"updated_at": now, "updated_by": user.user_id}},
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action=f"ticket_thread.{kind}.message.post",
        entity_refs=[
            {"collection": "work_orders", "id": str(wo["_id"]), "label": wo.get("reference")},
            {"collection": "ticket_threads", "id": str(thread["_id"]), "label": f"{kind} thread"},
        ],
        context_snapshot={
            "has_text": msg["text"] is not None,
            "attachments_count": len(msg["attachments"]),
            "mentions": msg["mentions"],
        },
    )

    return _serialize(msg)


# ---------------- Helpers used by work_orders.py hooks ----------------

async def append_system_event(
    db,
    wo: dict,
    actor_user_id: str,
    text: str,
    payload: dict | None = None,
) -> None:
    """
    Called by work_orders routes when an advance/cancel happens.
    Appends a system_event message to the SHARED thread (creating it lazily).
    Never raises — system events MUST NOT break the parent action.
    """
    try:
        thread = await _get_or_create_thread(db, wo, "shared", actor_user_id)
        if thread.get("sealed_at"):
            return
        now = _now()
        await db.ticket_messages.insert_one({
            "tenant_id": wo["tenant_id"],
            "thread_id": str(thread["_id"]),
            "work_order_id": str(wo["_id"]),
            "kind": "system_event",
            "actor_user_id": None,
            "ts": now,
            "text": text,
            "attachments": [],
            "mentions": [],
            "payload": payload or {},
            "created_at": now,
            "updated_at": now,
            "created_by": actor_user_id,
            "updated_by": actor_user_id,
        })
        await db.ticket_threads.update_one(
            {"_id": thread["_id"]}, {"$set": {"updated_at": now}}
        )
    except Exception:
        import traceback
        traceback.print_exc()


async def seal_threads(db, wo_id: str, tenant_id: str) -> int:
    """Seal both threads of a work_order. Returns number sealed."""
    now = _now()
    result = await db.ticket_threads.update_many(
        {
            "work_order_id": wo_id,
            "tenant_id": tenant_id,
            "sealed_at": None,
        },
        {"$set": {"sealed_at": now, "updated_at": now}},
    )
    return result.modified_count
