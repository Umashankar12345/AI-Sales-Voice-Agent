import logging
from datetime import datetime, timedelta
import pymongo
from pymongo import MongoClient
from app.config import settings

logger = logging.getLogger("voxsales.database")

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.connected = False

    def connect(self):
        try:
            self.client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000
            )
            # Verify connection
            self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.connected = True
            logger.info(f"Connected to MongoDB database: {settings.DATABASE_NAME}")
            self._ensure_indexes()
            self._seed_default_slots()
        except Exception as e:
            logger.warning(f"Failed to connect to MongoDB ({e}). Falling back to memory storage.")
            self.connected = False

    def _ensure_indexes(self):
        if not self.connected or self.db is None:
            return
        try:
            # Leads indexes
            self.db.leads.create_index([("email", pymongo.ASCENDING)])
            self.db.leads.create_index([("phone", pymongo.ASCENDING)])
            self.db.leads.create_index([("created_at", pymongo.DESCENDING)])
            
            # Appointments unique index to prevent duplicate bookings
            self.db.appointments.create_index(
                [("slot_date", pymongo.ASCENDING), ("slot_time", pymongo.ASCENDING)],
                unique=True
            )
            
            # Slots index
            self.db.slots.create_index(
                [("slot_date", pymongo.ASCENDING), ("slot_time", pymongo.ASCENDING)],
                unique=True
            )
            
            # Conversations index
            self.db.conversations.create_index([("session_id", pymongo.ASCENDING)], unique=True)
            self.db.conversations.create_index([("created_at", pymongo.DESCENDING)])

            # Cross-call lead memories & HubSpot sync logs indexes
            self.db.lead_memories.create_index([("lead_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
            self.db.lead_memories.create_index([("email", pymongo.ASCENDING)])
            self.db.lead_memories.create_index([("phone", pymongo.ASCENDING)])
            self.db.sync_logs.create_index([("lead_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    def _seed_default_slots(self):
        """
        Seed available counseling appointment slots for the upcoming 7 days if none exist.
        """
        if not self.connected or self.db is None:
            return
        try:
            existing_count = self.db.slots.count_documents({})
            if existing_count > 0:
                return

            time_slots = [
                "10:00 AM",
                "11:30 AM",
                "02:00 PM",
                "03:30 PM",
                "05:00 PM",
                "06:30 PM"
            ]

            today = datetime.now().date()
            slots_to_insert = []
            
            # Seed next 5 days
            for day_offset in range(1, 6):
                slot_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                for slot_time in time_slots:
                    slots_to_insert.append({
                        "slot_date": slot_date,
                        "slot_time": slot_time,
                        "is_booked": False,
                        "booked_by": None,
                        "created_at": datetime.utcnow()
                    })

            if slots_to_insert:
                self.db.slots.insert_many(slots_to_insert, ordered=False)
                logger.info(f"Seeded {len(slots_to_insert)} appointment slots into MongoDB.")
        except Exception as e:
            logger.error(f"Error seeding default appointment slots: {e}")

db = Database()
