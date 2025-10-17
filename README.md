# Zombie College - Prototype de Jeu 3D

Un prototype minimaliste de jeu de survie zombie dans un collège, réalisé avec Three.js.

> This is a repo by 11 years old Paul Melliand as a first vibe coding experience

## Description

Vous incarnez un survivant dans un collège envahi par des zombies. Explorez les bâtiments, couloirs et la cour, et éliminez les zombies pour survivre le plus longtemps possible.

## Fonctionnalités

- Environnement 3D réaliste : collège avec bâtiments texturés, salles de classe, couloirs et cour
- Sol en asphalte, bâtiments en béton avec fenêtres, salles en briques
- Arbres réalistes avec tronc texturé et feuillage naturel
- Contrôle du personnage en vue première personne (FPS)
- Fusil d'assaut 3D détaillé avec animations de recul et flash du canon
- IA des zombies : poursuite et attaque du joueur
- Modèles 3D de zombies low-poly avec bras tendus (format GLB)
- Système de combat avec arme à distance (tir au raycast)
- Système de vie pour le joueur et les zombies
- Compteur de score (zombies éliminés)
- Spawn continu de zombies pour une difficulté croissante
- Effets visuels : recul d'arme, flash de tir, feedback de dégâts, ombres portées

## Installation et Lancement

### Méthode 1 : Serveur HTTP simple (recommandé)

1. Assurez-vous d'avoir Python installé
2. Ouvrez un terminal dans le dossier public/
3. Lancez un serveur HTTP local :

```bash
# Python 3
python -m http.server 8000

# Ou Python 2
python -m SimpleHTTPServer 8000
```

4. Ouvrez votre navigateur et allez à : `http://localhost:8000`

### Méthode 2 : Node.js avec http-server

1. Installez http-server globalement :
```bash
npm install -g http-server
```

2. Lancez le serveur :
```bash
http-server
```

3. Ouvrez l'URL affichée dans le terminal (généralement `http://localhost:8080`)

### Méthode 3 : Extension Live Server (VS Code)

1. Installez l'extension "Live Server" dans VS Code
2. Faites un clic droit sur `index.html`
3. Sélectionnez "Open with Live Server"

## Commandes

- **FLÈCHES DIRECTIONNELLES** : Déplacement (avant/arrière/gauche/droite)
- **ESPACE** : Sauter
- **SOURIS** : Regarder autour de vous
- **A** : Tirer avec le fusil
- **Cliquez sur l'écran** : Verrouiller la souris pour jouer

## Gameplay

1. **Objectif** : Survivre et éliminer un maximum de zombies
2. **Zombies** : Les zombies verts apparaissent autour de vous et vous poursuivent
3. **Combat** : Visez avec la souris et cliquez pour tirer. Chaque zombie nécessite plusieurs tirs
4. **Santé** : Évitez les zombies - ils vous attaquent au corps à corps
5. **Game Over** : Quand votre santé atteint 0, la partie est terminée

## Configuration

Vous pouvez modifier les paramètres du jeu dans `game.js` :

```javascript
const CONFIG = {
    player: {
        speed: 0.1,        // Vitesse de déplacement
        jumpForce: 0.3,    // Force du saut
        health: 100        // Points de vie
    },
    zombie: {
        speed: 0.05,       // Vitesse des zombies
        damage: 10,        // Dégâts par attaque
        health: 30         // Points de vie
    },
    weapon: {
        damage: 25,        // Dégâts de l'arme
        range: 50,         // Portée
        cooldown: 300      // Délai entre les tirs (ms)
    }
};
```

## Structure du Projet

```
zombie-claude/
├── index.html                       # Page HTML principale avec l'interface utilisateur
├── game.js                          # Code principal du jeu (logique, 3D, IA)
├── zombie_lowpoly_arms_forward.glb  # Modèle 3D des zombies (low-poly, bras tendus)
└── README.md                        # Ce fichier
```

## Technologies Utilisées

- **Three.js** (v0.160.0) : Moteur de rendu 3D
- **GLTFLoader** : Chargement des modèles 3D (format GLB)
- **JavaScript ES6** : Logique du jeu
- **HTML5/CSS3** : Interface utilisateur
- **Canvas 2D API** : Génération de textures procédurales

## Améliorations Possibles

Ce prototype peut être enrichi avec :
- Sons et musique
- Différents types de zombies
- Plus d'armes (fusil à pompe, mitraillette)
- Power-ups et items de soin
- Système de munitions
- Intérieur détaillé des salles de classe
- Mini-map
- Missions et objectifs
- Sauvegarde du meilleur score

## Dépannage

### Le jeu ne se charge pas
- Vérifiez que vous utilisez un serveur HTTP (pas d'ouverture directe du fichier HTML)
- Vérifiez la console du navigateur (F12) pour les erreurs
- Assurez-vous d'avoir une connexion internet (Three.js est chargé depuis un CDN)

### Problèmes de performance
- Fermez les autres onglets du navigateur
- Réduisez la qualité graphique en modifiant `renderer.shadowMap.enabled = false` dans game.js
- Utilisez un navigateur moderne (Chrome, Firefox, Edge)

### La souris ne se verrouille pas
- Cliquez à nouveau sur la fenêtre du jeu
- Certains navigateurs bloquent le verrouillage de la souris par sécurité
- Essayez un autre navigateur

## Licence

Projet créé à des fins éducatives - Libre d'utilisation et de modification.
