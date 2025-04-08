from pymongo import MongoClient
from config import Config

client = MongoClient(Config.MONGO_URI) #pymongo library , class MongoClient gia sundesh me thn vash  (MONGO_URI --> .env)
db = client.get_default_database() 