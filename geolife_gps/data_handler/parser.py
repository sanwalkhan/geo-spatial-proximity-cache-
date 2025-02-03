import pandas as pd

def parse_plt_file(file_path: str) -> pd.DataFrame:
    """
    Parses a .plt file and extracts GPS data into a pandas DataFrame.
    Args:
        file_path (str): Path to the .plt file.
    Returns:
        pd.DataFrame: DataFrame containing GPS data.
    """
    columns = ["latitude", "longitude", "placeholder", "altitude", "date", "time"]
    data = pd.read_csv(file_path, skiprows=6, names=columns)
    data["timestamp"] = pd.to_datetime(data["date"] + " " + data["time"])
    return data[["latitude", "longitude", "altitude", "timestamp"]]
