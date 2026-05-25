# MediSync Mobile

Application mobile développée avec **Ionic + Angular + Capacitor**.  
Compatible Android.

## Technologies
- Ionic Framework
- Angular 17
- Capacitor
- TypeScript

## Prérequis
- Node.js v18+
- Ionic CLI : `npm install -g @ionic/cli`
- Android Studio (pour générer l'APK)

## Installation

```bash
# Cloner le projet
git clone https://github.com/RedouaneAchak/medisync.git
cd medisync/medisync-mobile

# Installer les dépendances
npm install

# Lancer en mode développement
ionic serve
```

## Générer l'APK Android

```bash
ionic build
npx cap sync android
npx cap open android
# Puis : Build → Generate APKs dans Android Studio
```

## Écrans disponibles
| Écran | Description |
|---|---|
| Login | Authentification patient |
| Accueil | Dashboard avec prochain RDV |
| Recherche | Recherche et filtrage de médecins |
| Booking | Prise de rendez-vous |
| Mes RDV | Liste des rendez-vous à venir et passés |
| Dossier | Dossier médical complet |
| Notifications | Rappels et alertes |
| Profil | Informations personnelles et paramètres |

## Structure du projet
