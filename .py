import os
import json

def generate_index_json(directory):
    """ Recursively creates index.json files for each directory inside `extensions`. """
    for root, dirs, files in os.walk(directory):
        index_data = []

        # Add directories
        for dir_name in dirs:
            index_data.append({"name": dir_name, "type": "dir", "path": os.path.join(root, dir_name).replace("\\", "/")})

        # Add files (excluding index.json itself)
        for file_name in files:
            if file_name == "index.json":
                continue
            index_data.append({"name": file_name, "type": "file", "path": os.path.join(root, file_name).replace("\\", "/")})

        # Save index.json in the current directory
        index_file_path = os.path.join(root, "index.json")
        with open(index_file_path, "w", encoding="utf-8") as json_file:
            json.dump(index_data, json_file, indent=2)

        print(f"Generated {index_file_path}")

if __name__ == "__main__":
    extensions_dir = "extensions"  # Change this if your folder has a different name
    if os.path.exists(extensions_dir):
        generate_index_json(extensions_dir)
        print("All index.json files generated successfully.")
    else:
        print(f"Directory '{extensions_dir}' not found!")
