import faiss
import numpy as np
import os
import logging
from typing import Optional, Tuple, List

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- FAISS Index Configuration ---
# Using the suggested directory structure from your input
FAISS_DATA_DIR = "data/embeddings"
FAISS_INDEX_FILENAME = "clip_index.faiss"
FAISS_INDEX_PATH = os.path.join(FAISS_DATA_DIR, FAISS_INDEX_FILENAME)

EMBEDDING_DIM = 512  # For CLIP ViT-B/32 model

# Global variable to hold the loaded FAISS index
# This will be loaded on demand or at startup
_faiss_index: Optional[faiss.Index] = None

def _initialize_faiss_directory():
    """Ensures the directory for FAISS index exists."""
    if not os.path.exists(FAISS_DATA_DIR):
        try:
            os.makedirs(FAISS_DATA_DIR, exist_ok=True)
            logger.info(f"Created FAISS data directory: {FAISS_DATA_DIR}")
        except Exception as e:
            logger.error(f"Failed to create FAISS data directory {FAISS_DATA_DIR}: {e}")
            raise

def get_faiss_index(force_reload: bool = False) -> Optional[faiss.Index]:
    """
    Loads the FAISS index from disk if it exists, otherwise creates a new one.
    The loaded/created index is stored in a global variable for reuse.

    Args:
        force_reload (bool): If True, forces reloading the index from disk even if already loaded.

    Returns:
        Optional[faiss.Index]: The loaded or newly created FAISS index, or None on failure.
    """
    global _faiss_index
    _initialize_faiss_directory() # Ensure directory exists first

    if not force_reload and _faiss_index is not None:
        logger.debug("Returning already loaded FAISS index.")
        return _faiss_index

    if os.path.exists(FAISS_INDEX_PATH):
        try:
            logger.info(f"Loading FAISS index from {FAISS_INDEX_PATH}...")
            _faiss_index = faiss.read_index(FAISS_INDEX_PATH)
            logger.info(f"FAISS index loaded successfully. Index has {_faiss_index.ntotal} vectors.")
            # Check if the loaded index has the correct dimensionality if it's not empty
            if _faiss_index.ntotal > 0 and _faiss_index.d != EMBEDDING_DIM:
                logger.error(f"Loaded FAISS index has dimension {_faiss_index.d}, but expected {EMBEDDING_DIM}. Discarding.")
                _faiss_index = None # Invalidate incorrect index
                # Potentially, here you might want to backup the old one and create a new one
        except Exception as e:
            logger.error(f"Failed to load FAISS index from {FAISS_INDEX_PATH}: {e}. A new index will be created.")
            _faiss_index = None # Ensure it's None so a new one is created
    
    if _faiss_index is None: # If not loaded or loading failed or dim mismatch
        try:
            logger.info(f"Creating a new FAISS index (IndexFlatIP) with dimension {EMBEDDING_DIM}.")
            # IndexFlatIP is for inner product (cosine similarity when vectors are normalized)
            _faiss_index = faiss.IndexFlatIP(EMBEDDING_DIM)
            logger.info("New FAISS index created successfully.")
            # Optionally, save the empty index immediately
            # save_faiss_index() 
        except Exception as e:
            logger.error(f"Failed to create new FAISS index: {e}")
            _faiss_index = None
            return None
            
    return _faiss_index

def add_embeddings_to_index(embeddings: np.ndarray) -> Tuple[bool, Optional[List[int]]]:
    """
    Adds a batch of embeddings to the FAISS index.
    Assumes embeddings are already normalized if using IndexFlatIP for cosine similarity.

    Args:
        embeddings (np.ndarray): A 2D numpy array of shape (num_embeddings, EMBEDDING_DIM).

    Returns:
        Tuple[bool, Optional[List[int]]]: 
            - First element is True if successful, False otherwise.
            - Second element is a list of FAISS IDs (indices) for the added embeddings if successful, 
              otherwise None. These IDs are sequential based on the current ntotal of the index.
    """
    index = get_faiss_index() # Ensure index is loaded/initialized
    if index is None:
        logger.error("FAISS index is not available. Cannot add embeddings.")
        return False, None

    if not isinstance(embeddings, np.ndarray) or embeddings.ndim != 2 or embeddings.shape[1] != EMBEDDING_DIM:
        logger.error(f"Embeddings must be a 2D numpy array with shape (*, {EMBEDDING_DIM}). Got {embeddings.shape if isinstance(embeddings, np.ndarray) else type(embeddings)}")
        return False, None
    
    if embeddings.dtype != np.float32:
        logger.debug("Converting embeddings to float32 for FAISS.")
        embeddings = embeddings.astype(np.float32)

    try:
        num_added = embeddings.shape[0]
        starting_id = index.ntotal
        index.add(embeddings)
        logger.info(f"Successfully added {num_added} embeddings to FAISS index. Index now has {index.ntotal} total vectors.")
        # The IDs in FAISS are their 0-based indices. So the new IDs range from starting_id to starting_id + num_added - 1
        new_faiss_ids = list(range(starting_id, starting_id + num_added))
        return True, new_faiss_ids
    except Exception as e:
        logger.error(f"Failed to add embeddings to FAISS index: {e}")
        return False, None

def save_faiss_index() -> bool:
    """
    Saves the current FAISS index to disk.

    Returns:
        bool: True if successful, False otherwise.
    """
    index = get_faiss_index()
    if index is None:
        logger.error("FAISS index is not available. Cannot save.")
        return False
    
    _initialize_faiss_directory() # Ensure directory exists

    try:
        logger.info(f"Saving FAISS index with {index.ntotal} vectors to {FAISS_INDEX_PATH}...")
        faiss.write_index(index, FAISS_INDEX_PATH)
        logger.info("FAISS index saved successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to save FAISS index to {FAISS_INDEX_PATH}: {e}")
        return False

def search_faiss_index(query_vectors: np.ndarray, k: int) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    Searches the FAISS index for the top k similar embeddings to the query_vector(s).
    Assumes query_vector is already normalized if using IndexFlatIP for cosine similarity.

    Args:
        query_vectors (np.ndarray): A 1D or 2D numpy array of query embedding(s).
                                     If 1D, shape is (EMBEDDING_DIM,).
                                     If 2D, shape is (num_queries, EMBEDDING_DIM).
        k (int): The number of nearest neighbors to retrieve.

    Returns:
        Optional[Tuple[np.ndarray, np.ndarray]]: 
            - Distances (D): np.ndarray of shape (num_queries, k) containing distances.
            - Indices (I): np.ndarray of shape (num_queries, k) containing FAISS IDs of neighbors.
            Returns None if search fails or index is not available.
    """
    index = get_faiss_index()
    if index is None or index.ntotal == 0:
        logger.warning("FAISS index is not available or is empty. Cannot search.")
        return None

    if not isinstance(query_vectors, np.ndarray):
        logger.error("Query vector(s) must be a numpy array.")
        return None
    
    if query_vectors.ndim == 1:
        if query_vectors.shape[0] != EMBEDDING_DIM:
            logger.error(f"Query vector has dimension {query_vectors.shape[0]}, expected {EMBEDDING_DIM}.")
            return None
        query_vectors = np.expand_dims(query_vectors, axis=0) # Convert 1D to 2D for search
    elif query_vectors.ndim == 2:
        if query_vectors.shape[1] != EMBEDDING_DIM:
            logger.error(f"Query vectors have dimension {query_vectors.shape[1]}, expected {EMBEDDING_DIM}.")
            return None
    else:
        logger.error("Query vector(s) must be 1D or 2D numpy array.")
        return None
        
    if query_vectors.dtype != np.float32:
        logger.debug("Converting query vector(s) to float32 for FAISS search.")
        query_vectors = query_vectors.astype(np.float32)

    try:
        logger.info(f"Searching FAISS index for {k} nearest neighbors for {query_vectors.shape[0]} queries.")
        distances, indices = index.search(query_vectors, k)
        return distances, indices
    except Exception as e:
        logger.error(f"Error during FAISS search: {e}")
        return None

# Example usage (can be run directly for testing)
if __name__ == '__main__':
    logger.info("Running FAISS utils example...")

    # 1. Get (load or create) index
    idx = get_faiss_index()
    if idx:
        logger.info(f"Initial index size: {idx.ntotal}")

        # 2. Add some dummy embeddings
        num_dummy_embeddings = 10
        dummy_embeddings = np.random.rand(num_dummy_embeddings, EMBEDDING_DIM).astype(np.float32)
        # Normalize for IndexFlatIP (cosine similarity)
        faiss.normalize_L2(dummy_embeddings)
        
        success, new_ids = add_embeddings_to_index(dummy_embeddings)
        if success:
            logger.info(f"Added {len(new_ids)} dummy embeddings. New FAISS IDs: {new_ids}")
            logger.info(f"Index size after adding: {idx.ntotal}")

            # 3. Add more embeddings to test sequential IDs
            more_dummy_embeddings = np.random.rand(5, EMBEDDING_DIM).astype(np.float32)
            faiss.normalize_L2(more_dummy_embeddings)
            success_more, new_ids_more = add_embeddings_to_index(more_dummy_embeddings)
            if success_more:
                logger.info(f"Added {len(new_ids_more)} more dummy embeddings. New FAISS IDs: {new_ids_more}")
                logger.info(f"Index size after adding more: {idx.ntotal}")

            # 4. Save the index
            if save_faiss_index():
                logger.info("Index saved.")

                # 5. Test loading by forcing reload
                logger.info("Forcing reload of index...")
                idx_reloaded = get_faiss_index(force_reload=True)
                if idx_reloaded:
                    logger.info(f"Reloaded index size: {idx_reloaded.ntotal}")
                    assert idx_reloaded.ntotal == idx.ntotal, "Reloaded index size mismatch!"

                    # 6. Search the index
                    if idx_reloaded.ntotal > 0:
                        query_vector = dummy_embeddings[0].reshape(1, -1) # Search for the first embedding we added
                        # query_vector already normalized
                        
                        k_neighbors = 3
                        search_results = search_faiss_index(query_vector, k=k_neighbors)
                        
                        if search_results:
                            D, I = search_results
                            logger.info(f"Search results for vector 0 (top {k_neighbors}):")
                            logger.info(f"  Distances: {D}")
                            logger.info(f"  Indices (FAISS IDs): {I}")
                            # For IndexFlatIP with normalized vectors, distance is 1 - cosine_similarity.
                            # So, a perfect match would have a cosine similarity of 1 and distance close to 0.
                            # For dot product, higher is more similar.
                            # Since IndexFlatIP uses dot product, higher values of D indicate higher similarity.
                            assert I[0][0] == 0, "Search did not return the query vector itself as the closest match!"
                        else:
                            logger.error("Search failed.")
                    else:
                        logger.info("Skipping search test as index is empty after reload (should not happen).")
            else:
                logger.error("Failed to save index.")
        else:
            logger.error("Failed to add dummy embeddings.")
    else:
        logger.error("Failed to get/create FAISS index in example.")

    # Example of how you might clear the index for a fresh start in testing
    # if os.path.exists(FAISS_INDEX_PATH):
    #     logger.warning(f"Removing existing FAISS index at {FAISS_INDEX_PATH} for fresh test run.")
    #     os.remove(FAISS_INDEX_PATH)
    # _faiss_index = None # Clear global var
    # logger.info("Cleared FAISS index for next run (if any).") 