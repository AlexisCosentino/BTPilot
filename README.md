# BTPilot – Gestion intelligente de chantier

BTPilot est une application **mobile-first (PWA)** destinée aux artisans et entreprises BTP pour gérer leurs chantiers de manière simple et efficace.  
L'objectif est de centraliser les notes, photos, audio et synthèses de chantier, générer des devis rapidement et gérer les tâches associées.

## Fonctionnalités principales

- **Dashboard chantiers** : créer ou sélectionner un chantier existant  
- **Ajout d’entrées** : photo, audio, note texte en 2 taps  
- **Statuts de chantier** : demande de devis → devis accepté → chantier en cours → chantier terminé  
- **Synthèses automatiques** : par statut et globale, exportables en PDF  
- **Devis client** : génération à partir d’un catalogue prestations/prix, modifiable facilement  
- **Tickets / tâches** : création de todo list pour chaque chantier, assignables à des utilisateurs  
- **Gestion multi-utilisateur / entreprise** : chantiers partagés, tâches assignées, espace entreprise sécurisé  

## Stack technologique

- **Frontend** : Next.js (React)  
- **Styling** : Tailwind CSS  
- **Form / Input** : react-hook-form  
- **PWA / Offline** : next-pwa  
- **Backend** : API routes Next.js  
- **Auth / Gestion utilisateurs** : Clerk / Auth0  
- **Base de données & stockage** : Supabase (Postgres + fichiers)  
- **Intelligence artificielle** : OpenAI API (synthèse, structuration, speech-to-text)  
- **PDF export** : jsPDF  


## Architecture

BTPilot/  
├─ frontend/  
│ ├─ pages/  
│ ├─ components/  
│ ├─ utils/  
│ └─ styles/  
├─ backend/  
│ ├─ api/  
│ │ ├─ chantiers.js  
│ │ ├─ entrees.js  
│ │ ├─ synthese.js  
│ │ ├─ devis.js  
│ │ └─ tickets.js  
├─ .gitignore  
├─ package.json  
└─ next.config.js  

- **Frontend** : pages, composants réutilisables, hooks, gestion UI  
- **Backend** : routes API pour CRUD chantier / entrée / synthèse / devis / tickets  
- **Supabase** : base de données et stockage fichiers  
- **OpenAI API** : génération des synthèses  


set NODE_TLS_REJECT_UNAUTHORIZED=0