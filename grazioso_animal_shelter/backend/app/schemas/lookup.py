from pydantic import BaseModel


class LookupValues(BaseModel):
    animal_types: list[str]
    breeds: list[str]
    sexes: list[str]
    outcome_types: list[str]
