# Florière

A flower-gifting app for Bangkok. Built with React Native + Expo (frontend) and Flask + MySQL (backend).

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Database
- Create a MySQL database called `floriere`
- Run the schema and seed queries in `backend/schema.sql`
- Update `backend/db.py` with your MySQL password

### Frontend
```bash
cd frontend/floriere-app
npm install
npx expo start
```