from fastapi import FastAPI
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


uri = "mongodb+srv://aiseki:1qaz2wsx@cluster0.j3b3xbq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" #dont do this, use an env var when doing passwords

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

#testing