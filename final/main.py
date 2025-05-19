from fastapi import FastAPI, HTTPException, Body, status
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bson import ObjectId

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

try:
    uri = (
        f"mongodb+srv://{quote_plus(os.getenv('DB_USERNAME', ''))}:"
        f"{quote_plus(os.getenv('DB_PASSWORD', ''))}@"
        "cluster0.j3b3xbq.mongodb.net/"
        "?retryWrites=true&w=majority&appName=Cluster0"
    )
    client = MongoClient(uri, server_api=ServerApi('1'), connectTimeoutMS=5000)
    client.admin.command('ping')
    db = client["attendance_db"]
    students = db["students"]
    announcements = db["announcements"]
    print("Successfully connected to MongoDB!")
except Exception as e:
    print(f"Database connection failed: {e}")
    raise RuntimeError("Database connection failed")

try:
    students.drop_indexes()  
    students.create_index([("date", 1), ("name", 1)], unique=True)
    print("Created database indexes without student_id field")
except Exception as e:
    print(f"Index creation failed: {e}")

class StudentMessageCreate(BaseModel):
    content: str
    sender: str = "Anonymous"
    contact_info: str = ""

class StudentMessageResponse(StudentMessageCreate):
    id: str
    timestamp: datetime

class StudentCreate(BaseModel):
    name: str
    date: str
    is_present: bool = False

class StudentResponse(StudentCreate):
    name: str
    date: str
    is_present: bool
    timestamp: datetime

class AttendanceUpdate(BaseModel):
    is_present: bool

class AnnouncementCreate(BaseModel):
    content: str
    author: str

class AnnouncementResponse(AnnouncementCreate):
    timestamp: datetime

@app.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate):
    """Create a new student attendance record"""
    try:
        student_dict = student.dict()
        student_dict["timestamp"] = datetime.now()

        existing = students.find_one({
            "name": student.name,
            "date": student.date
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student already exists for this date"
            )

        result = students.insert_one(student_dict)
        created_student = students.find_one({"name": student.name, "date": student.date})

        return StudentResponse(
            name=created_student["name"],
            date=created_student["date"],
            is_present=created_student["is_present"],
            timestamp=created_student["timestamp"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.put("/students/{name}/{date}", response_model=StudentResponse)
def update_attendance(name: str, date: str, update: AttendanceUpdate = Body(...)):
    """Update student attendance based on name and date"""
    try:
        result = students.update_one(
            {"name": name, "date": date},
            {"$set": {"is_present": update.is_present}}
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )

        updated_student = students.find_one({"name": name, "date": date})

        return StudentResponse(
            name=updated_student["name"],
            date=updated_student["date"],
            is_present=updated_student["is_present"],
            timestamp=updated_student["timestamp"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/students/{date}", response_model=List[StudentResponse])
def get_students(date: str):
    """Get students for a specific date"""
    try:
        student_list = list(students.find({"date": date}))
        return [
            StudentResponse(
                name=student["name"],
                date=student["date"],
                is_present=student["is_present"],
                timestamp=student["timestamp"]
            )
            for student in student_list
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(announcement: AnnouncementCreate):
    """Create a new announcement"""
    try:
        announcement_dict = announcement.dict()
        announcement_dict["timestamp"] = datetime.now()

        result = announcements.insert_one(announcement_dict)
        created_announcement = announcements.find_one({"_id": result.inserted_id})

        return AnnouncementResponse(
            content=created_announcement["content"],
            author=created_announcement["author"],
            timestamp=created_announcement["timestamp"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/announcements", response_model=List[AnnouncementResponse])
def get_announcements():
    """Get all announcements"""
    try:
        announcements_list = list(announcements.find().sort("timestamp", -1))
        return [
            AnnouncementResponse(
                content=announcement["content"],
                author=announcement["author"],
                timestamp=announcement["timestamp"]
            )
            for announcement in announcements_list
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/health")
def health_check():
    """Check service health"""
    try:
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )

@app.delete("/students")
def clear_students():
    """Clear all student records from the database"""
    try:
        result = students.delete_many({})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No student records found to delete"
            )
        return {"message": "All student records have been cleared"}
    except Exception as e:
        print(f"Error clearing database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear database"
        )

@app.delete("/announcements")
def clear_announcements():
    """Clear all announcements from the database"""
    try:
        result = db["announcements"].delete_many({})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No announcements found to delete"
            )
        return {"message": "All announcements have been cleared"}
    except Exception as e:
        print(f"Error clearing announcements: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear announcements"
        )

@app.post("/student-messages", response_model=StudentMessageResponse)
async def create_message(message: StudentMessageCreate):
    message_data = message.dict()
    message_data["timestamp"] = datetime.now()
    result = db.student_messages.insert_one(message_data)
    return {**message_data, "id": str(result.inserted_id)}

@app.get("/student-messages", response_model=List[StudentMessageResponse])
async def get_messages():
    messages = []
    for msg in db.student_messages.find().sort("timestamp", -1):
        msg["id"] = str(msg["_id"])
        messages.append(msg)
    return messages

@app.delete("/student-messages/{message_id}")
async def delete_message(message_id: str):
    db.student_messages.delete_one({"_id": ObjectId(message_id)})
    return {"status": "deleted"}