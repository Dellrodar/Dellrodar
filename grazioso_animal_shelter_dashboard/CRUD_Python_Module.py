from pymongo import MongoClient

class AnimalShelter(object):
    """
    CRUD operations for Animal collection in MongoDB

    This class provides complete Create, Read, Update, and Delete (CRUD) operations
    for documents in the MongoDB animals collection. It handles database authentication
    and connection management automatically upon instantiation.

    Attributes:
        client (MongoClient): MongoDB client connection
        database (Database): Reference to the 'aac' database
        collection (Collection): Reference to the 'animals' collection
    """
    
    def __init__(self, host='localhost', port=27017, db='aac'):
        # Initializing the MongoClient. 
        # 
        # You must edit the password below for your environment. 
        # 
        # Connection Variables 
        # 
        # USER = 'aacuser'
        # PASS = 'SNHU1234'
        self.host = host
        self.port = port
        self.db_name = db
        self.database = None
        self.client = None
        self.collection = None
        

    def login(self, username, password):
        # Login function to access the MongoDB databases and collections. 
        # This is hard-wired to use the animals collection
        COL = 'animals'

        try:
            self.client = MongoClient('mongodb://%s:%s@%s:%d' % (username, password, self.host, self.port))
        except Exception as e:
            print("Server Exception: %s", e)
            self.client = None
            return Exception('Unable to connect to the server')
        
        if self.client is not None:
            self.database = self.client['%s' % (self.db_name)]
            self.collection = self.database['%s' % (COL)]
    
    def next_record(self):
        """
        Return the next available record number for new documents
        
        This method finds the document with the highest rec_num value in the collection
        and returns the next sequential number. If no documents exist, it returns 1.
        This is useful for maintaining sequential record numbers across documents.
        
        Returns:
            int: The next available record number (starts at 1 if collection is empty)
            
        Raises:
            Exception: If there is an error retrieving the record number from the database 
        """
        try:
            # Find the document with the highest record number
            last_record = self.collection.find_one(sort=[("rec_num", -1)])
            
            # If a record exists, increment the rec_num, otherwise start at 1
            if last_record and "rec_num" in last_record:
                return last_record["rec_num"] + 1
            else:
                return 1
        except Exception as e:
            raise Exception(f"Error retrieving next record number: {str(e)}")
    
    def create(self, data):
        """
        Insert a document into the MongoDB animals collection (CREATE operation)
        
        This method implements the "C" in CRUD by inserting a new document into
        the animals collection. It validates the input data before attempting
        the insert operation.
        
        Args:
            data (dict): A dictionary containing key/value pairs to insert.
                        Must be a non-empty dictionary with at least one key/value pair.
        
        Returns:
            bool: True if the insert was successful and acknowledged by MongoDB,
                  False if the insert failed or data was invalid
        """
        # Validate input data
        if data is None or not isinstance(data, dict) or len(data) == 0:
            print("Nothing to save, because data parameter is empty or invalid")
            return False
        
        try:
            # Attempt to insert the document into the collection
            result = self.collection.insert_one(data)
            
            # Check if the insert was acknowledged and successful
            if result.acknowledged:
                return True
            else:
                return False
                
        except Exception as e:
            # Log the error and return False
            print(f"An error occurred during insert: {str(e)}")
            return False
    
    def read(self, query):
        """
        Query for documents from the MongoDB animals collection (READ operation)
        
        This method implements the "R" in CRUD by retrieving documents that match
        the specified query criteria. It uses the find() method to return all
        matching documents.
        
        Args:
            query (dict): MongoDB query criteria as a dictionary of key/value pairs.
                         Use an empty dictionary {} to retrieve all documents.
                         Example: {"animal_type": "Dog"} or {"age": {"$gt": 5}}
        
        Returns:
            list: A list of matching documents if successful, empty list if no matches
                  or if an error occurs. Each document is returned as a dictionary.
        """
        try:
            # Validate that query is provided
            if query is not None:
                # Use find() to get cursor with all matching documents
                cursor = self.collection.find(query)
                # Convert cursor to list and return
                return list(cursor)
            else:
                # If no query provided, return all documents
                cursor = self.collection.find({})
                return list(cursor)
                
        except Exception as e:
            # Log the error and return empty list
            print(f"Error reading from database: {str(e)}")
            return []
        
    def update(self, query, update_data):
        """
        Update document(s) in the MongoDB animals collection (UPDATE operation)

        This method implements the "U" in CRUD by updating one or more documents that match
        the specified query criteria. It uses the update_many() method to update all
        matching documents.

        Args:
            query (dict): MongoDB query criteria as a dictionary of key/value pairs.
                         Used to find documents to update.
                         Example: {"animal_type": "Dog"} or {"age": {"$gt": 5}}
            update_data (dict): A dictionary containing the update operations to perform.
                               Should use MongoDB update operators like $set, $inc, etc.
                               Example: {"$set": {"age": 6}} or {"$inc": {"count": 1}}

        Returns:
            int: The number of documents modified in the collection.
                 Returns 0 if no documents were modified or if an error occurs.
        """
        try:
            # Validate input parameters
            if query is None or not isinstance(query, dict):
                print("Invalid query parameter: must be a dictionary")
                return 0

            if update_data is None or not isinstance(update_data, dict) or len(update_data) == 0:
                print("Nothing to update, because update_data parameter is empty or invalid")
                return 0

            # Attempt to update documents in the collection
            result = self.collection.update_many(query, update_data)

            # Return the count of modified documents
            return result.modified_count

        except Exception as e:
            # Log the error and return 0
            print(f"An error occurred during update: {str(e)}")
            return 0

    def delete(self, query):
        """
        Delete document(s) from the MongoDB animals collection (DELETE operation)

        This method implements the "D" in CRUD by removing one or more documents that match
        the specified query criteria. It uses the delete_many() method to remove all
        matching documents.

        Args:
            query (dict): MongoDB query criteria as a dictionary of key/value pairs.
                         Used to find documents to delete.
                         Example: {"animal_type": "Dog"} or {"age": {"$gt": 5}}
                         NOTE: Empty queries are not allowed to prevent accidental deletion of entire collection.

        Returns:
            int: The number of documents removed from the collection.
                 Returns 0 if no documents were removed.

        Raises:
            ValueError: If query is None, not a dictionary, or is an empty dictionary.
            Exception: If there is an error during the delete operation.
        """
        # Validate input parameter
        if query is None or not isinstance(query, dict):
            raise ValueError("Invalid query parameter: must be a dictionary")

        # Prevent deletion of entire collection with empty query
        if len(query) == 0:
            raise ValueError("Empty query not allowed. Specify criteria to delete specific documents.")

        try:
            # Attempt to delete documents from the collection
            result = self.collection.delete_many(query)

            # Return the count of deleted documents
            return result.deleted_count

        except Exception as e:
            # Log and re-raise the error
            print(f"An error occurred during delete: {str(e)}")
            raise