from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import requests
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator
from enum import Enum as PyEnum
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enum para status do ticket
class TicketStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# Database setup
DATABASE_URL = "postgresql://postgres:password@postgres:5432/tickets"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    client_ip = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Pydantic models
class TicketCreate(BaseModel):
    title: str
    description: str

class TicketUpdate(BaseModel):
    status: TicketStatus

class TicketResponse(TicketCreate):
    id: int
    status: TicketStatus
    client_ip: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# FastAPI app
app = FastAPI()

# Configuração CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração de métricas
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)

# External API
IPIFY_URL = "https://api.ipify.org?format=json"

def get_client_ip():
    try:
        response = requests.get(IPIFY_URL)
        return response.json().get("ip", "unknown")
    except Exception as e:
        logger.error(f"Error getting client IP: {str(e)}")
        return "unknown"

# Routes
@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    db = SessionLocal()
    try:
        client_ip = get_client_ip()
        db_ticket = Ticket(
            title=ticket.title,
            description=ticket.description,
            client_ip=client_ip
        )
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        
        logger.info(f"New ticket created - ID: {db_ticket.id}, Title: {db_ticket.title}")
        
        return db_ticket
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/tickets/", response_model=list[TicketResponse])
async def get_tickets():
    db = SessionLocal()
    try:
        tickets = db.query(Ticket).all()
        logger.info(f"Retrieved {len(tickets)} tickets")
        return tickets
    except Exception as e:
        logger.error(f"Error retrieving tickets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket_status(ticket_id: int, update: TicketUpdate):
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        logger.info(f"Updating ticket {ticket_id} from {ticket.status} to {update.status}")
        
        ticket.status = update.status
        db.commit()
        db.refresh(ticket)
        return ticket
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating ticket {ticket_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/tickets/count")
async def get_tickets_count():
    db = SessionLocal()
    try:
        count = db.query(Ticket).count()
        logger.info(f"Current ticket count: {count}")
        return {"count": count}
    except Exception as e:
        logger.error(f"Error counting tickets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
