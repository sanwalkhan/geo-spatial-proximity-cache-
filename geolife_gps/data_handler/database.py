from pymongo import MongoClient
import pandas as pd

def connect_to_mongo(uri: str, db_name: str):
    """
    Connects to MongoDB and returns the database object.
    Args:
        uri (str): MongoDB connection URI.
        db_name (str): Database name.
    Returns:
        Database: MongoDB database object.
    """
    client = MongoClient(uri)
    db = client[db_name]
    print(f"Connected to MongoDB database: {db_name}")
    return db

def store_to_mongo(db, collection_name: str, user_id: str, data: pd.DataFrame) -> None:
    """
    Stores GPS data into a MongoDB collection.
    Args:
        db: MongoDB database object.
        collection_name (str): Name of the collection to store data.
        user_id (str): User ID associated with the data.
        data (pd.DataFrame): DataFrame containing GPS data.
    """
    collection = db[collection_name]
    records = data.to_dict(orient='records')
    for record in records:
        record['user_id'] = user_id
    collection.insert_many(records)
    print(f"Inserted {len(records)} records for user {user_id} into {collection_name}.")
