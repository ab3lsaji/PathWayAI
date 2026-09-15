import os
import shutil
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

DATA_DIR = "data"
DB_DIR = "./chroma_db"

def main():
    if not os.path.exists(DATA_DIR):
        print(f"Directory not found: {DATA_DIR}")
        return

    # Clear existing vector database to prevent duplicate entries
    if os.path.exists(DB_DIR):
        print("Clearing old vector database...")
        shutil.rmtree(DB_DIR)

    print(f"Loading all documents from directory: '{DATA_DIR}'...")
    loader = DirectoryLoader(
        DATA_DIR,
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"}
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} document(s).")

    print("Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} text chunk(s).")

    print("Generating embeddings via Ollama and saving to ChromaDB...")
    embedding_model = OllamaEmbeddings(model="nomic-embed-text")
    
    Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        persist_directory=DB_DIR
    )

    print("Ingestion complete! Multi-file knowledge base saved to './chroma_db'.")

if __name__ == "__main__":
    main()