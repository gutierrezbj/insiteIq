"""
InsiteIQ Modo 5 — ReportTemplate (Decisión #1 · "el cliente manda el molde").

Una plantilla = secciones tipadas con campos. El playbook del técnico en la PWA
se DERIVA de la plantilla (cada campo obligatorio es un paso) y el entregable
por sitio se ensambla desde las respuestas. Versionada: cambiar el molde crea
otra versión (supersedes_id), nunca se pierde historia.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

FieldType = Literal["text", "textarea", "number", "boolean", "choice", "photo", "photos", "rating"]
SectionType = Literal["structural", "narrative", "media", "appendix"]
TemplateStatus = Literal["draft", "active", "superseded"]


class TemplateField(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str
    label: str
    type: FieldType = "text"
    required: bool = False
    options: list[str] = Field(default_factory=list)   # choice
    help: str | None = None
    unit: str | None = None
    min_photos: int | None = None                       # photos


class TemplateSection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str
    title: str
    type: SectionType = "structural"
    description: str | None = None
    auto_assemblable: bool = True
    fields: list[TemplateField] = Field(default_factory=list)
    media_tags_required: list[str] = Field(default_factory=list)


class ReportTemplate(BaseMongoModel):
    code: str                              # "claro_us_wireless_survey"
    version: str                           # "1.0"
    name: str
    language: str = "es"
    client_organization_id: str | None = None
    sections: list[TemplateSection] = Field(default_factory=list)
    status: TemplateStatus = "active"
    supersedes_id: str | None = None
    notes: str | None = None
