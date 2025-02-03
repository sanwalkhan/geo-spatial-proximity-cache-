import os
from data_handler.unzipper import unzip_dataset
from data_handler.parser import parse_plt_file
from data_handler.database import connect_to_mongo, store_to_mongo

def process_plt_files(data_folder: str, db, collection_name: str) -> None:
    """
    Processes all .plt files in the dataset and stores them in MongoDB.
    Args:
        data_folder (str): Path to the dataset folder.
        db: MongoDB database object.
        collection_name (str): Name of the collection to store data.
    """
    for user_folder in os.listdir(data_folder):
        user_path = os.path.join(data_folder, user_folder, "Trajectory")
        if os.path.isdir(user_path):
            print(f"Processing user folder: {user_folder}")
            for file_name in os.listdir(user_path):
                if file_name.endswith('.plt'):
                    file_path = os.path.join(user_path, file_name)
                    print(f"Parsing file: {file_path}")
                    data = parse_plt_file(file_path)
                    store_to_mongo(db, collection_name, user_folder, data)

if __name__ == "__main__":
    # Paths and database configuration
    zip_file_path = "Geolife_Trajectories.zip"
    extract_to = "Geolife_Trajectories/Geolife Trajectories 1.3/Data"
    collection_name = "gps_trajectories"
    mongo_uri = "mongodb://localhost:27017"
    db_name = "geolife"

    # Step 1: Unzip dataset if not already unzipped
    dataset_unzipped = unzip_dataset(zip_file_path, extract_to)

    # Step 2: Connect to MongoDB
    db = connect_to_mongo(mongo_uri, db_name)

    # Step 3: Process and store .plt files
    process_plt_files(extract_to, db, collection_name)
