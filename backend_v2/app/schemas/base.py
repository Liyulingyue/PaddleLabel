from pydantic import ConfigDict

BaseSchema = ConfigDict(populate_by_name=True, from_attributes=True)