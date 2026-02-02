"""Seed data for initial setup"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.models import StatusDefinition, ProcessType, AIPersonality, AppSetting, DashboardLayout

def seed():
    db = SessionLocal()
    try:
        # Status definitions
        if db.query(StatusDefinition).count() == 0:
            statuses = [
                StatusDefinition(name="Tervezés", order=1, color="#6366f1"),
                StatusDefinition(name="Fejlesztés", order=2, color="#f59e0b"),
                StatusDefinition(name="Tesztelés", order=3, color="#3b82f6"),
                StatusDefinition(name="Review", order=4, color="#8b5cf6"),
                StatusDefinition(name="Kész", order=5, color="#10b981"),
            ]
            db.add_all(statuses)
            db.commit()
            print("Státuszok létrehozva")

        # Process types (5 monthly processes)
        if db.query(ProcessType).count() == 0:
            processes = [
                ProcessType(
                    name="Sprintek átdolgozása & Tartalomjegyzék",
                    description="Sprint release dokumentumok BeeWise-tól, B+N-es sablonba illesztés, formázás, helyesírás ellenőrzés.",
                    quick_guide="1. Sprint dokumentum átvétele BeeWise-tól\n2. Belső DevOps oszlop törlése\n3. ID → Sorszám átnevezés\n4. B+N és KEF dokumentáció szétválasztás\n5. Sablon szerinti formázás\n6. Helyesírás ellenőrzés",
                    order=1,
                ),
                ProcessType(
                    name="ESG elszámolás",
                    description="Havi ESG kimutatás készítése vizsgáló cég részére. Munkalapok számlálása projektkódonként, Top 7 kórház kilistázása.",
                    quick_guide="1. Szűrés hónapra (WorkTaskActivatedTime)\n2. Státusz szűrés (lezárt, kész, stb.)\n3. Pivot készítés ProjectCode szerint\n4. Értékek visszaírása alap táblába\n5. Top 7 kórház kilistázása\n6. Százalék + ár számítás (33M Ft keret)\n7. Beillesztés Tamás ESG táblázatába",
                    order=2,
                ),
                ProcessType(
                    name="B+N Gondnoklás - Anyagelszámolás",
                    description="Árazási és alapadat-ellenőrzési folyamat. Beárazott és árazatlan tételek kezelése, validáció.",
                    quick_guide="1. Tételek szétválasztása (beárazott/árazatlan)\n2. Árazatlan tételek automatikus árazása (Python script)\n3. Telephely + PST kód ellenőrzés (pivot)\n4. KZ kód ellenőrzés\n5. Kórháznevek standardizálás\n6. Régiók ellenőrzése\n7. Felesleges oszlopok törlése\n8. Dátum/ár formátum egységesítés",
                    order=3,
                ),
                ProcessType(
                    name="Alvállalkozói Gondnoklás - Anyagelszámolás",
                    description="Ugyanaz mint a B+N Gondnoklás, de sablon szerinti kinézet átalakítás nélkül.",
                    quick_guide="1. Tételek szétválasztása\n2. Árazatlan tételek árazása\n3. Alapadat ellenőrzés (PST, KZ, kórháznevek)\n4. Régiók ellenőrzése\n5. Felesleges oszlopok törlése\n6. Formátum egységesítés\n(Nincs sablon szerinti átalakítás)",
                    order=4,
                ),
                ProcessType(
                    name="Gondnoklás - Élőerő",
                    description="Élőerő feldolgozás: Excel tisztítás, kódpótlás, TIG szám hozzárendelés, formázás, KZ kódonkénti szétmentés.",
                    quick_guide="1. Státusz szűrés (lezárt, kész, stb.)\n2. Kötelező mezők ellenőrzése (FVPCode, KZ, ProjectCode)\n3. Hiányzó kódok pótlása Location alapján\n4. Felesleges oszlopok törlése\n5. CustomerControllingCode → KZ kód átnevezés\n6. TIG szám hozzárendelés (gondnoklás.xlsx)\n7. Excel formázás\n8. Szétmentés KZ kódonként",
                    order=5,
                ),
            ]
            db.add_all(processes)
            db.commit()
            print("Folyamat típusok létrehozva")

        # AI Personalities
        if db.query(AIPersonality).count() == 0:
            personalities = [
                AIPersonality(
                    provider="ollama",
                    name="Lokális Asszisztens",
                    system_prompt="Te egy magyar nyelvű munkasegéd AI vagy. Segítesz a havi folyamatok kezelésében, dokumentumok elemzésében és kérdések megválaszolásában. Legyél precíz és tömör.",
                    tone="Professzionális, segítőkész",
                    expertise="Folyamatkezelés, dokumentumelemzés, Excel feldolgozás",
                    language="magyar",
                    is_active=True,
                ),
                AIPersonality(
                    provider="openrouter",
                    name="Online Asszisztens",
                    system_prompt="Te egy magyar nyelvű szakértő AI asszisztens vagy. Komplex elemzéseket, összefoglalókat és javaslatokat készítesz. Részletes és alapos válaszokat adj.",
                    tone="Szakértő, részletes",
                    expertise="Komplex elemzés, stratégiai javaslatok, dokumentumfeldolgozás",
                    language="magyar",
                    is_active=True,
                ),
            ]
            db.add_all(personalities)
            db.commit()
            print("AI személyiségek létrehozva")

        # App Settings
        if db.query(AppSetting).count() == 0:
            app_settings = [
                AppSetting(key="theme", value="light"),
                AppSetting(key="ai_provider", value="ollama"),
                AppSetting(key="openrouter_model", value="anthropic/claude-3.5-sonnet"),
                AppSetting(key="chat_context_size", value="20"),
                AppSetting(key="audit_log_retention_days", value="365"),
                AppSetting(key="auto_generate_monthly", value="true"),
            ]
            db.add_all(app_settings)
            db.commit()
            print("Alkalmazás beállítások létrehozva")

        # Dashboard layout
        if db.query(DashboardLayout).count() == 0:
            widgets = [
                DashboardLayout(widget_id="daily_tasks", x=0, y=0, w=6, h=4),
                DashboardLayout(widget_id="process_status", x=6, y=0, w=6, h=4),
                DashboardLayout(widget_id="upcoming_deadlines", x=0, y=4, w=4, h=3),
                DashboardLayout(widget_id="token_stats", x=4, y=4, w=4, h=3),
                DashboardLayout(widget_id="recent_chat", x=8, y=4, w=4, h=3),
                DashboardLayout(widget_id="ai_suggestions", x=0, y=7, w=6, h=3),
                DashboardLayout(widget_id="email_summary", x=6, y=7, w=6, h=3),
            ]
            db.add_all(widgets)
            db.commit()
            print("Dashboard layout létrehozva")

        print("Seed data betöltés kész!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
