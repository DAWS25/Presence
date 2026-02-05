from mangum import Mangum
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

handler = Mangum(app)
