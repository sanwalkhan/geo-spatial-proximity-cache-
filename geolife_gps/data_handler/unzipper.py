import zipfile
import os

def unzip_dataset(zip_file_path: str, extract_to: str) -> bool:
    """
    Unzips the dataset if it hasn't been unzipped already.
    Args:
        zip_file_path (str): Path to the ZIP file.
        extract_to (str): Directory to extract the ZIP contents.
    Returns:
        bool: True if unzipped, False if already unzipped.
    """
    if not os.path.exists(extract_to):
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        print(f"Dataset unzipped to: {extract_to}")
        return True
    else:
        print(f"Dataset already unzipped at: {extract_to}")
        return False
