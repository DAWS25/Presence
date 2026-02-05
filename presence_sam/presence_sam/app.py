from mangum import Mangum
from fastapi import FastAPI

app = FastAPI()

@app.get("/fn/__hc")
def get_healthcheck():
    return {"health_status": "OK"}

@app.get("/")
def read_root():
    return {"Hello": "World"}

handler = Mangum(app)
