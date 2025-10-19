import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// ===== CONFIGURATION =====
const CONFIG = {
    player: {
        height: 1.8,
        speed: 0.1,
        jumpForce: 0.3,
        health: 100
    },
    zombie: {
        speed: 0.005,
        damage: 10,
        health: 100,
        attackRange: 2,
        attackCooldown: 1000
    },
    weapon: {
        damage: 25,
        range: 50,
        cooldown: 300
    }
};

// ===== GAME STATE =====
const gameState = {
    score: 0,
    isGameOver: false,
    canShoot: true,
    playerHealth: CONFIG.player.health,
    currentWeapon: 'rifle' // 'rifle', 'pistol' ou 'flamethrower'
};

// ===== SCENE SETUP =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ===== LIGHTING =====
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// ===== GLTF LOADER =====
const gltfLoader = new GLTFLoader();

// ===== TEXTURE LOADER =====
const textureLoader = new THREE.TextureLoader();

// ===== AUDIO LOADER =====
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Créer les sons
const touchSound = new THREE.Audio(audioListener);
const dieSound = new THREE.Audio(audioListener);
const treeSound = new THREE.Audio(audioListener);
const zombieDieSound = new THREE.Audio(audioListener);
const walkSound = new THREE.Audio(audioListener);

// Buffers pour les sons d'armes (pour créer plusieurs instances)
let flamethrowerBuffer = null;
let rifleBuffer = null;
let pistolBuffer = null;

// Charger les fichiers audio
const audioLoader = new THREE.AudioLoader();

audioLoader.load('./sounds/touch.wav', (buffer) => {
    touchSound.setBuffer(buffer);
    touchSound.setVolume(0.5);
    console.log('✓ Son touch.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de touch.wav:', error);
});

audioLoader.load('./sounds/die.wav', (buffer) => {
    dieSound.setBuffer(buffer);
    dieSound.setVolume(0.7);
    console.log('✓ Son die.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de die.wav:', error);
});

audioLoader.load('./sounds/flamme.flac', (buffer) => {
    flamethrowerBuffer = buffer;
    console.log('✓ Son flamme.flac chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de flamme.flac:', error);
});

audioLoader.load('./sounds/fusil.wav', (buffer) => {
    rifleBuffer = buffer;
    console.log('✓ Son fusil.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de fusil.wav:', error);
});

audioLoader.load('./sounds/pistolet.wav', (buffer) => {
    pistolBuffer = buffer;
    console.log('✓ Son pistolet.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de pistolet.wav:', error);
});

audioLoader.load('./sounds/arbre.wav', (buffer) => {
    treeSound.setBuffer(buffer);
    treeSound.setVolume(0.5);
    console.log('✓ Son arbre.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de arbre.wav:', error);
});

audioLoader.load('./sounds/zombie-die.wav', (buffer) => {
    zombieDieSound.setBuffer(buffer);
    zombieDieSound.setVolume(0.4);
    console.log('✓ Son zombie-die.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de zombie-die.wav:', error);
});

audioLoader.load('./sounds/walk.wav', (buffer) => {
    walkSound.setBuffer(buffer);
    walkSound.setVolume(0.3);
    walkSound.setLoop(true); // Le son de marche boucle
    console.log('✓ Son walk.wav chargé');
}, undefined, (error) => {
    console.error('Erreur de chargement de walk.wav:', error);
});

// Fonction pour jouer un son d'arme (crée une nouvelle instance à chaque fois)
function playWeaponSound(weaponType) {
    let buffer = null;
    let volume = 0.5;

    if (weaponType === 'rifle' && rifleBuffer) {
        buffer = rifleBuffer;
        volume = 0.6;
    } else if (weaponType === 'pistol' && pistolBuffer) {
        buffer = pistolBuffer;
        volume = 0.5;
    } else if (weaponType === 'flamethrower' && flamethrowerBuffer) {
        buffer = flamethrowerBuffer;
        volume = 0.4;
    }

    if (buffer) {
        const sound = new THREE.Audio(audioListener);
        sound.setBuffer(buffer);
        sound.setVolume(volume);
        sound.play();

        // Nettoyer la mémoire une fois le son terminé
        sound.onEnded = () => {
            sound.disconnect();
        };
    }
}

// ===== COLLEGE ENVIRONMENT =====
let collegeModel = null;

// Charger la texture de brique depuis le fichier
let brickTexture = null;

// Initialiser les tableaux globaux immédiatement
window.trees = [];
window.powerups = [];

// Créer texture d'asphalte pour le sol
function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base asphalte avec variations de gris
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
    gradient.addColorStop(0, '#3a3a3a');
    gradient.addColorStop(0.5, '#2a2a2a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Texture très granuleuse (graviers colorés)
    for (let i = 0; i < 12000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 2.5;

        // Mélange de graviers gris, beiges et blancs
        const colorType = Math.random();
        let r, g, b;
        if (colorType < 0.6) {
            // Graviers gris foncé
            const shade = Math.random() * 50;
            r = g = b = 40 + shade;
        } else if (colorType < 0.85) {
            // Graviers beiges/marron
            r = 80 + Math.random() * 60;
            g = 70 + Math.random() * 50;
            b = 50 + Math.random() * 40;
        } else {
            // Graviers clairs/blancs
            const bright = 120 + Math.random() * 80;
            r = g = b = bright;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + Math.random() * 0.5})`;
        ctx.fillRect(x, y, size, size);
    }

    // Cailloux plus gros et variés
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 2 + Math.random() * 4;

        const colorType = Math.random();
        if (colorType < 0.5) {
            ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${60 + Math.random() * 40}, ${60 + Math.random() * 40}, 0.6)`;
        } else if (colorType < 0.8) {
            ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${85 + Math.random() * 40}, ${60 + Math.random() * 30}, 0.5)`;
        } else {
            ctx.fillStyle = `rgba(${140 + Math.random() * 60}, ${140 + Math.random() * 60}, ${140 + Math.random() * 60}, 0.7)`;
        }

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Taches d'huile/essence (irisées)
    for (let i = 0; i < 25; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 15 + Math.random() * 40;
        const gradient2 = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient2.addColorStop(0, 'rgba(80, 60, 100, 0.3)');
        gradient2.addColorStop(0.4, 'rgba(40, 80, 90, 0.2)');
        gradient2.addColorStop(0.7, 'rgba(60, 40, 50, 0.1)');
        gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient2;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    // Fissures réalistes dans l'asphalte
    ctx.strokeStyle = 'rgba(15, 15, 15, 0.8)';
    for (let i = 0; i < 25; i++) {
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const startX = Math.random() * 512;
        const startY = Math.random() * 512;
        ctx.moveTo(startX, startY);
        let currentX = startX;
        let currentY = startY;
        for (let j = 0; j < 6; j++) {
            currentX += (Math.random() - 0.5) * 60;
            currentY += (Math.random() - 0.5) * 60;
            ctx.lineTo(currentX, currentY);
        }
        ctx.stroke();
    }

    // Lignes de marquage au sol (blanches usées)
    if (Math.random() > 0.3) {
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.6)';
        ctx.lineWidth = 8;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(256, 0);
        ctx.lineTo(256, 512);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Traces de pneus
    for (let i = 0; i < 8; i++) {
        const startX = Math.random() * 400;
        const startY = Math.random() * 512;
        ctx.strokeStyle = 'rgba(10, 10, 10, 0.3)';
        ctx.lineWidth = 3 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let j = 0; j < 10; j++) {
            ctx.lineTo(startX + j * 10 + Math.random() * 3, startY + (Math.random() - 0.5) * 20);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.needsUpdate = true;
    console.log('✓ Texture asphalte créée');
    return texture;
}

console.log('Création de la texture d\'asphalte...');
const asphaltTexture = createAsphaltTexture();
console.log('Texture asphalte prête !');

// Charger la texture de brique AVANT le collège
console.log('Chargement de la texture de brique...');
textureLoader.load(
    './brick_texture_1024.png',
    (texture) => {
        brickTexture = texture;
        brickTexture.wrapS = THREE.RepeatWrapping;
        brickTexture.wrapT = THREE.RepeatWrapping;
        brickTexture.repeat.set(2, 2);
        console.log('✓ Texture de brique chargée depuis brick_texture_1024.png');

        // Maintenant charger le collège
        createCollege();
    },
    undefined,
    (error) => {
        console.error('Erreur de chargement de la texture de brique:', error);
        // Charger le collège quand même
        createCollege();
    }
);

function createCollege() {
    // Charger le modèle 3D du collège
    gltfLoader.load(
        './college_revesz_long_simplified.glb',
        // onLoad
        (gltf) => {
            console.log('Modèle du collège chargé avec succès');
            collegeModel = gltf.scene;

            // Configurer le modèle (Y-up, origine près de l'entrée côté abris bus)
            // PREMIÈRE PASSE : Identifier et enregistrer toutes les portes AVANT de créer les collisions
            const doorMeshes = [];
            collegeModel.traverse((child) => {
                if (child.isMesh) {
                    const nameLower = (child.name || '').toLowerCase();
                    const isDoor = child.name && (nameLower.includes('door') || nameLower.includes('porte'));

                    if (isDoor) {
                        const bbox = new THREE.Box3().setFromObject(child);
                        const size = new THREE.Vector3();
                        const center = new THREE.Vector3();
                        bbox.getSize(size);
                        bbox.getCenter(center);

                        // Enregistrer la porte avec une zone très large
                        addDoor(child.name, center.x, 1.5, center.z, size.x * 5, 3, size.z * 5);
                        console.log(`🚪 Porte enregistrée: ${child.name} à (${center.x.toFixed(1)}, ${center.z.toFixed(1)})`);
                        doorMeshes.push(child);
                    }
                }
            });

            console.log(`✓ ${doorMeshes.length} portes enregistrées avant création des collisions`);

            // DEUXIÈME PASSE : Appliquer les matériaux et créer les collisions
            collegeModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Appliquer les textures selon le type d'objet
                    const nameLower = (child.name || '').toLowerCase();
                    const isSol = nameLower.includes('sol') || nameLower.includes('parking') ||
                                  nameLower.includes('ground') || nameLower.includes('floor');
                    const isDoor = doorMeshes.includes(child);

                    if (isSol) {
                        // Sol : asphalte gris foncé avec texture
                        const newMaterial = new THREE.MeshStandardMaterial({
                            map: asphaltTexture,
                            color: 0x3a3a3a,
                            roughness: 0.95,
                            metalness: 0
                        });
                        child.material = newMaterial;
                        console.log(`✓ Texture asphalte sur: ${child.name}`);
                    } else if (isDoor) {
                        // PORTES : matériau vert semi-transparent
                        const doorMaterial = new THREE.MeshStandardMaterial({
                            color: 0x00ff00,        // Vert vif
                            transparent: true,
                            opacity: 0.6,           // Semi-transparent
                            emissive: 0x00aa00,     // Légère émission verte
                            emissiveIntensity: 0.3,
                            roughness: 0.5,
                            metalness: 0.1
                        });
                        child.material = doorMaterial;
                        console.log(`🚪 Matériau porte appliqué sur: ${child.name}`);
                    } else {
                        // Vérifier si le mesh a des coordonnées UV
                        const hasUV = child.geometry && child.geometry.attributes.uv;
                        console.log(`📐 ${child.name} - UV présentes: ${hasUV ? 'OUI' : 'NON'}`);

                        if (!hasUV && child.geometry) {
                            // Générer des UV basiques (mapping planaire)
                            const positions = child.geometry.attributes.position;
                            const uvs = [];

                            for (let i = 0; i < positions.count; i++) {
                                const x = positions.getX(i);
                                const z = positions.getZ(i);
                                // Mapping planaire simple basé sur X et Z
                                uvs.push(x * 0.1, z * 0.1);
                            }

                            child.geometry.setAttribute('uv',
                                new THREE.Float32BufferAttribute(uvs, 2)
                            );
                            console.log(`✓ UV générées pour: ${child.name}`);
                        }

                        // Murs : texture de brique réelle
                        const newMaterial = new THREE.MeshStandardMaterial({
                            map: brickTexture,
                            color: 0xa85545, // Couleur terre cuite/brique en fallback
                            roughness: 0.9,
                            metalness: 0,
                            side: THREE.DoubleSide // Rendre les deux côtés du mur
                        });
                        child.material = newMaterial;
                        console.log(`✓ Texture brique sur: ${child.name}`);
                    }

                    // RÉACTIVER LES COLLISIONS - Système simple avec murs invisibles
                    if (!isSol) {
                        const bbox = new THREE.Box3().setFromObject(child);
                        const size = new THREE.Vector3();
                        const center = new THREE.Vector3();
                        bbox.getSize(size);
                        bbox.getCenter(center);

                        if (isDoor) {
                            // C'est une porte : déjà enregistrée dans la première passe
                            // NE PAS créer de collision pour les portes !
                            console.log(`🚪 Porte (matériau appliqué): ${child.name}`)
                        } else {
                            // Créer une collision simple au niveau du sol (hauteur de 3m)
                            // Tous les murs ont une collision - on gérera les portes dans checkCollision()
                            if (size.x > 2 && size.z > 2) {
                                addCollisionBox(center.x, 1.5, center.z, size.x * 1.1, 3, size.z * 1.1);
                                console.log(`✓ Collision créée: ${child.name} à (${center.x.toFixed(1)}, ${center.z.toFixed(1)}) - taille ${(size.x * 1.1).toFixed(1)}x${(size.z * 1.1).toFixed(1)}`);
                            }
                        }
                    }
                }
            });

            // Position du modèle (origine déjà bien placée)
            collegeModel.position.set(0, 0, 0);
            scene.add(collegeModel);

            console.log('✓ Collège chargé:', window.collisionObjects.length, 'collisions créées');
        },
        // onProgress
        (xhr) => {
            console.log('Chargement du collège: ' + (xhr.loaded / xhr.total * 100) + '%');
        },
        // onError
        (error) => {
            console.error('Erreur de chargement du modèle du collège:', error);
        }
    );

    // Création de texture pour le tronc
    const createBarkTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base marron
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(0, 0, 256, 256);

        // Lignes verticales (écorce)
        ctx.strokeStyle = '#2a1810';
        ctx.lineWidth = 2;
        for (let x = 0; x < 256; x += 15 + Math.random() * 10) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.random() * 10 - 5, 256);
            ctx.stroke();
        }

        // Nœuds dans le bois
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            ctx.fillStyle = '#221510';
            ctx.beginPath();
            ctx.ellipse(x, y, 10, 15, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    };

    const barkTexture = createBarkTexture();

    // Arbres destructibles avec tronc et feuillage
    for (let i = 0; i < 8; i++) {
        const treeGroup = new THREE.Group();
        treeGroup.userData.health = 3; // 3 tirs pour détruire
        treeGroup.userData.velocity = new THREE.Vector3(0, 0, 0);
        treeGroup.userData.angularVelocity = 0;
        treeGroup.userData.isDestroyed = false;

        // Tronc
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 5, 12);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            roughness: 0.95,
            metalness: 0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Feuillage (plusieurs sphères pour un aspect naturel)
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5016,
            roughness: 0.9,
            metalness: 0
        });

        // Feuillage principal
        const mainFoliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const mainFoliage = new THREE.Mesh(mainFoliageGeometry, foliageMaterial);
        mainFoliage.position.y = 6;
        mainFoliage.castShadow = true;
        treeGroup.add(mainFoliage);

        // Feuillage secondaire pour forme irrégulière
        for (let j = 0; j < 3; j++) {
            const foliageGeometry = new THREE.SphereGeometry(1.2 + Math.random() * 0.5, 8, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            const offsetAngle = (j / 3) * Math.PI * 2;
            foliage.position.set(
                Math.cos(offsetAngle) * 1.2,
                5.5 + Math.random() * 0.8,
                Math.sin(offsetAngle) * 1.2
            );
            foliage.castShadow = true;
            treeGroup.add(foliage);
        }

        // Feuillage supérieur
        const topFoliageGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const topFoliage = new THREE.Mesh(topFoliageGeometry, foliageMaterial);
        topFoliage.position.y = 7.5;
        topFoliage.castShadow = true;
        treeGroup.add(topFoliage);

        const angle = (i / 8) * Math.PI * 2;
        treeGroup.position.set(Math.cos(angle) * 35, 0, Math.sin(angle) * 35);
        treeGroup.rotation.y = Math.random() * Math.PI * 2;

        // Ajouter une collision pour l'arbre (cylindre autour du tronc)
        const treeCollision = {
            min: new THREE.Vector3(
                treeGroup.position.x - 0.6,
                0,
                treeGroup.position.z - 0.6
            ),
            max: new THREE.Vector3(
                treeGroup.position.x + 0.6,
                5,
                treeGroup.position.z + 0.6
            )
        };
        window.collisionObjects.push(treeCollision);
        treeGroup.userData.collisionIndex = window.collisionObjects.length - 1;
        console.log(`✓ Collision arbre créée à (${treeGroup.position.x.toFixed(1)}, ${treeGroup.position.z.toFixed(1)})`);

        scene.add(treeGroup);
        window.trees.push(treeGroup);
    }

    // Power-ups (objets lumineux)
    for (let i = 0; i < 10; i++) {
        const powerupGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const powerupMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.8,
            metalness: 0.7,
            roughness: 0.2
        });
        const powerup = new THREE.Mesh(powerupGeometry, powerupMaterial);

        // Position aléatoire dans la cour
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 30;
        powerup.position.set(
            Math.cos(angle) * distance,
            1 + Math.sin(Date.now() * 0.001 + i) * 0.3, // Animation de flottement
            Math.sin(angle) * distance
        );
        powerup.castShadow = true;
        powerup.userData.floatOffset = i; // Pour animation différente
        scene.add(powerup);
        window.powerups.push(powerup);
    }
}

// Le collège est maintenant chargé automatiquement après le chargement de la texture de brique

// ===== COLLISION SYSTEM =====
// Array global pour stocker les objets de collision (murs, bâtiments)
window.collisionObjects = [];
// Array global pour stocker les portes (pas de collision, mais détection de passage)
window.doorObjects = [];

// Fonction pour ajouter un objet de collision
function addCollisionBox(x, y, z, width, height, depth) {
    window.collisionObjects.push({
        min: new THREE.Vector3(x - width / 2, y - height / 2, z - depth / 2),
        max: new THREE.Vector3(x + width / 2, y + height / 2, z + depth / 2)
    });
}

// Fonction pour ajouter une porte (zone de détection sans collision)
function addDoor(name, x, y, z, width, height, depth) {
    const door = {
        name: name,
        min: new THREE.Vector3(x - width / 2, y - height / 2, z - depth / 2),
        max: new THREE.Vector3(x + width / 2, y + height / 2, z + depth / 2),
        hasPlayerPassed: false // Pour éviter de logger plusieurs fois
    };
    window.doorObjects.push(door);
    console.log(`🚪 [CRÉATION PORTE] ${name}`);
    console.log(`   Centre: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    console.log(`   Taille: ${width.toFixed(2)} x ${height.toFixed(2)} x ${depth.toFixed(2)}`);
    console.log(`   Min: (${door.min.x.toFixed(2)}, ${door.min.y.toFixed(2)}, ${door.min.z.toFixed(2)})`);
    console.log(`   Max: (${door.max.x.toFixed(2)}, ${door.max.y.toFixed(2)}, ${door.max.z.toFixed(2)})`);
}

// Les collisions seront calculées automatiquement depuis le modèle GLB du collège
// TODO: Ajouter des collisions basées sur la géométrie du modèle chargé

// Fonction auxiliaire pour vérifier si le joueur est dans une zone de porte
function isPlayerInDoor(playerPos, radius) {
    for (const door of window.doorObjects) {
        if (!door) continue;

        const isInDoor =
            playerPos.x + radius > door.min.x &&
            playerPos.x - radius < door.max.x &&
            playerPos.y + radius > door.min.y &&
            playerPos.y - radius < door.max.y &&
            playerPos.z + radius > door.min.z &&
            playerPos.z - radius < door.max.z;

        if (isInDoor) {
            console.log(`✅ Joueur dans la zone de porte ${door.name} - collisions désactivées`);
            return true;
        }
    }
    return false;
}

// Fonction pour vérifier la collision et pousser le joueur hors du mur
function checkCollision(newPos, radius = 0.5) {
    // Si le joueur est dans une porte, désactiver les collisions
    if (isPlayerInDoor(newPos, radius)) {
        return false; // Pas de collision si dans une porte
    }

    for (const box of window.collisionObjects) {
        // Ignorer les collisions retirées (arbres détruits)
        if (!box) continue;

        // Vérifier si la position du joueur (avec son rayon) entre en collision avec la boîte
        if (newPos.x + radius > box.min.x && newPos.x - radius < box.max.x &&
            newPos.y + CONFIG.player.height / 2 > box.min.y && newPos.y - CONFIG.player.height / 2 < box.max.y &&
            newPos.z + radius > box.min.z && newPos.z - radius < box.max.z) {
            return true; // Collision détectée
        }
    }

    return false; // Pas de collision
}

// Fonction pour pousser le joueur hors d'un mur s'il est coincé dedans
function pushPlayerOutOfWalls(playerPos, radius = 0.5) {
    // Si le joueur est dans une porte, ne pas le pousser
    if (isPlayerInDoor(playerPos, radius)) {
        return;
    }

    for (const box of window.collisionObjects) {
        if (!box) continue;

        if (playerPos.x + radius > box.min.x && playerPos.x - radius < box.max.x &&
            playerPos.y + CONFIG.player.height / 2 > box.min.y && playerPos.y - CONFIG.player.height / 2 < box.max.y &&
            playerPos.z + radius > box.min.z && playerPos.z - radius < box.max.z) {

            // Le joueur est dans le mur, calculer la direction la plus proche pour sortir
            const overlapX = Math.min(
                Math.abs((playerPos.x + radius) - box.min.x),
                Math.abs((playerPos.x - radius) - box.max.x)
            );
            const overlapZ = Math.min(
                Math.abs((playerPos.z + radius) - box.min.z),
                Math.abs((playerPos.z - radius) - box.max.z)
            );

            // Pousser sur l'axe avec le moins de chevauchement
            if (overlapX < overlapZ) {
                // Pousser sur X
                if (playerPos.x < (box.min.x + box.max.x) / 2) {
                    playerPos.x = box.min.x - radius - 0.1;
                } else {
                    playerPos.x = box.max.x + radius + 0.1;
                }
            } else {
                // Pousser sur Z
                if (playerPos.z < (box.min.z + box.max.z) / 2) {
                    playerPos.z = box.min.z - radius - 0.1;
                } else {
                    playerPos.z = box.max.z + radius + 0.1;
                }
            }
        }
    }
}

// Fonction pour détecter le passage du joueur par une porte
function checkDoorPassage(playerPos, radius) {
    console.log(`🔍 [Door Check] Position joueur: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)}), rayon: ${radius}`);
    console.log(`🔍 [Door Check] Nombre de portes: ${window.doorObjects.length}`);

    for (let i = 0; i < window.doorObjects.length; i++) {
        const door = window.doorObjects[i];
        if (!door) continue;

        console.log(`🚪 [Porte ${i}] ${door.name}`);
        console.log(`   - Min: (${door.min.x.toFixed(2)}, ${door.min.y.toFixed(2)}, ${door.min.z.toFixed(2)})`);
        console.log(`   - Max: (${door.max.x.toFixed(2)}, ${door.max.y.toFixed(2)}, ${door.max.z.toFixed(2)})`);

        // Vérifier si le joueur est dans la zone de la porte (AABB simple)
        const checkX = playerPos.x + radius > door.min.x && playerPos.x - radius < door.max.x;
        const checkY = playerPos.y + radius > door.min.y && playerPos.y - radius < door.max.y;
        const checkZ = playerPos.z + radius > door.min.z && playerPos.z - radius < door.max.z;

        console.log(`   - Check X: ${checkX} (${(playerPos.x - radius).toFixed(2)} < ${door.max.x.toFixed(2)} && ${(playerPos.x + radius).toFixed(2)} > ${door.min.x.toFixed(2)})`);
        console.log(`   - Check Y: ${checkY} (${(playerPos.y - radius).toFixed(2)} < ${door.max.y.toFixed(2)} && ${(playerPos.y + radius).toFixed(2)} > ${door.min.y.toFixed(2)})`);
        console.log(`   - Check Z: ${checkZ} (${(playerPos.z - radius).toFixed(2)} < ${door.max.z.toFixed(2)} && ${(playerPos.z + radius).toFixed(2)} > ${door.min.z.toFixed(2)})`);

        const isInDoor = checkX && checkY && checkZ;
        console.log(`   - Résultat: ${isInDoor ? '✅ DANS LA PORTE' : '❌ PAS DANS LA PORTE'}`);

        if (isInDoor && !door.hasPlayerPassed) {
            console.log(`🚪 ✅ ✅ ✅ Entrée par la porte ${door.name}`);
            door.hasPlayerPassed = true;
        } else if (!isInDoor && door.hasPlayerPassed) {
            // Réinitialiser quand le joueur sort de la zone
            console.log(`🚪 Joueur sorti de la porte ${door.name}`);
            door.hasPlayerPassed = false;
        }
    }
}

// ===== PLAYER SETUP =====
const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0066ff });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
// Spawn loin des bâtiments pour éviter les collisions initiales
player.position.set(0, CONFIG.player.height / 2, 30);
player.castShadow = true;
scene.add(player);

camera.position.set(0, CONFIG.player.height, 0);
player.add(camera);

// Player physics
const playerVelocity = new THREE.Vector3();
let isOnGround = false;

// ===== WEAPONS =====
// Créer le fusil d'assaut
function createRifle() {
    const rifle = new THREE.Group();

    // Corps principal du fusil
    const rifleBodyGeometry = new THREE.BoxGeometry(0.08, 0.15, 1.2);
    const rifleBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.7,
        roughness: 0.3
    });
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleBodyMaterial);
    rifleBody.position.set(0, 0, 0);
    rifle.add(rifleBody);

    // Canon du fusil
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.9,
        roughness: 0.2
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.6);
    rifle.add(barrel);

    // Crosse du fusil
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.4);
    const stockMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.8
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, 0, 0.6);
    rifle.add(stock);

    // Poignée
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.12);
    const grip = new THREE.Mesh(gripGeometry, stockMaterial);
    grip.position.set(0, -0.15, 0.1);
    grip.rotation.z = 0.2;
    rifle.add(grip);

    // Chargeur
    const magGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.15);
    const magMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.5
    });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.25, -0.1);
    rifle.add(magazine);

    rifle.position.set(0.25, -0.25, -0.6);
    rifle.rotation.y = -0.1;
    return rifle;
}

// Créer le pistolet
function createPistol() {
    const pistol = new THREE.Group();

    // Corps du pistolet
    const pistolBodyGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.35);
    const pistolBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.2
    });
    const pistolBody = new THREE.Mesh(pistolBodyGeometry, pistolBodyMaterial);
    pistolBody.position.set(0, 0, -0.1);
    pistol.add(pistolBody);

    // Canon du pistolet
    const pistolBarrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
    const pistolBarrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.9,
        roughness: 0.1
    });
    const pistolBarrel = new THREE.Mesh(pistolBarrelGeometry, pistolBarrelMaterial);
    pistolBarrel.rotation.x = Math.PI / 2;
    pistolBarrel.position.set(0, 0.05, -0.35);
    pistol.add(pistolBarrel);

    // Poignée du pistolet
    const pistolGripGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.15);
    const pistolGripMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.7
    });
    const pistolGrip = new THREE.Mesh(pistolGripGeometry, pistolGripMaterial);
    pistolGrip.position.set(0, -0.2, 0.05);
    pistolGrip.rotation.z = 0.15;
    pistol.add(pistolGrip);

    // Détail de visée
    const sightGeometry = new THREE.BoxGeometry(0.02, 0.03, 0.02);
    const sightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3
    });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0, 0.09, -0.2);
    pistol.add(sight);

    pistol.position.set(0.2, -0.2, -0.4);
    pistol.rotation.y = -0.1;
    return pistol;
}

// Créer le lance-flammes
function createFlamethrower() {
    const flamethrower = new THREE.Group();

    // Corps principal (réservoir)
    const tankGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16);
    const tankMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b0000,
        metalness: 0.7,
        roughness: 0.3
    });
    const tank = new THREE.Mesh(tankGeometry, tankMaterial);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(0, -0.05, 0.1);
    flamethrower.add(tank);

    // Tuyau de connexion
    const hoseGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const hoseMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.9
    });
    const hose = new THREE.Mesh(hoseGeometry, hoseMaterial);
    hose.rotation.x = Math.PI / 2;
    hose.position.set(0.05, 0, -0.1);
    flamethrower.add(hose);

    // Lance (partie avant)
    const nozzleGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.6, 12);
    const nozzleMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        metalness: 0.8,
        roughness: 0.2
    });
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0, -0.4);
    flamethrower.add(nozzle);

    // Poignée avant
    const frontGripGeometry = new THREE.TorusGeometry(0.06, 0.015, 8, 16);
    const frontGrip = new THREE.Mesh(frontGripGeometry, hoseMaterial);
    frontGrip.rotation.y = Math.PI / 2;
    frontGrip.position.set(0, -0.08, -0.3);
    flamethrower.add(frontGrip);

    // Poignée arrière
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.1);
    const gripMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.18, 0.05);
    grip.rotation.z = 0.2;
    flamethrower.add(grip);

    // Détails de valve
    const valveGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const valveMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.3,
        metalness: 0.6
    });
    const valve = new THREE.Mesh(valveGeometry, valveMaterial);
    valve.position.set(0, 0.08, 0.1);
    flamethrower.add(valve);

    // Bout de la lance (ouverture)
    const tipGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 0.4,
        metalness: 0.7
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0, -0.7);
    flamethrower.add(tip);

    flamethrower.position.set(0.2, -0.22, -0.5);
    flamethrower.rotation.y = -0.1;
    return flamethrower;
}

// Créer les trois armes
const rifleWeapon = createRifle();
const pistolWeapon = createPistol();
const flamethrowerWeapon = createFlamethrower();

// Ajouter l'arme active à la caméra
let currentWeaponMesh = rifleWeapon;
camera.add(currentWeaponMesh);

// ===== ZOMBIES =====
const zombies = [];

// Création de texture de peau zombie
const createZombieSkinTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base de peau pourrie (vert-gris)
    ctx.fillStyle = '#8b9a7c';
    ctx.fillRect(0, 0, 512, 512);

    // Taches de sang
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 10 + Math.random() * 30;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(139, 0, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    // Plaies et déchirures
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = '#4a0000';
        ctx.fillRect(x, y, 5 + Math.random() * 15, 2 + Math.random() * 8);
    }

    // Texture grumeleuse
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(Math.random() * 30) - 15;
        ctx.fillStyle = `rgba(${139 + shade}, ${154 + shade}, ${124 + shade}, 0.3)`;
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
};

const zombieSkinTexture = createZombieSkinTexture();

// Chargement du modèle 3D zombie
let zombieModel = null;
let zombieModelLoaded = false;

gltfLoader.load(
    './zombie_lowpoly_arms_forward.glb',
    // onLoad
    (gltf) => {
        console.log('Modèle zombie 3D chargé avec succès');
        zombieModel = gltf.scene;

        // Configuration du modèle avec texture personnalisée
        zombieModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Appliquer la texture de peau zombie
                child.material = new THREE.MeshStandardMaterial({
                    map: zombieSkinTexture,
                    roughness: 0.9,
                    metalness: 0,
                    color: 0xffffff
                });
            }
        });

        zombieModelLoaded = true;
    },
    // onProgress
    (xhr) => {
        console.log('Chargement du modèle zombie: ' + (xhr.loaded / xhr.total * 100) + '%');
    },
    // onError
    (error) => {
        console.error('Erreur de chargement du modèle zombie:', error);
    }
);

class Zombie {
    constructor(x, z) {
        this.health = CONFIG.zombie.health;
        this.lastAttackTime = 0;
        this.velocity = new THREE.Vector3();
        this.mesh = null;
        this.isBurning = false;
        this.burnStartTime = 0;
        this.fireParticles = [];

        // Attendre que le modèle soit chargé
        if (!zombieModelLoaded || !zombieModel) {
            console.warn('Modèle zombie pas encore chargé');
            return;
        }

        this.mesh = zombieModel.clone();

        // Calculer la hauteur actuelle du modèle
        const box = new THREE.Box3().setFromObject(this.mesh);
        const currentHeight = box.max.y - box.min.y;

        // Calculer l'échelle pour atteindre 1.5m de hauteur (zombies plus petits)
        const targetHeight = 1.5;
        const scale = targetHeight / currentHeight;

        // Appliquer l'échelle uniforme
        this.mesh.scale.set(scale, scale, scale);

        // Rotation pour mettre le zombie debout (rotation de 90° sur l'axe X)
        this.mesh.rotation.x = -Math.PI / 2;

        // Position au sol
        this.mesh.position.set(x, 0, z);

        // Activer les ombres pour tous les meshes enfants
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Sauvegarder le matériau original pour les effets
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material.clone();
                }
            }
        });

        scene.add(this.mesh);
    }

    update() {
        if (gameState.isGameOver) return;

        // Si le zombie brûle, prendre des dégâts au fil du temps
        if (this.isBurning) {
            const burnDuration = Date.now() - this.burnStartTime;
            if (burnDuration < 3000) { // Brûle pendant 3 secondes
                if (burnDuration % 300 < 16) { // Dégâts tous les 300ms environ
                    this.takeDamage(5);
                }
                // Mettre à jour les particules de feu
                this.updateFireParticles();
            } else {
                this.stopBurning();
            }
        }

        // Mouvement vers le joueur
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, this.mesh.position);
        direction.y = 0;
        const distance = direction.length();
        direction.normalize();

        // Attaque si proche
        if (distance < CONFIG.zombie.attackRange) {
            const now = Date.now();
            if (now - this.lastAttackTime > CONFIG.zombie.attackCooldown) {
                this.attack();
                this.lastAttackTime = now;
            }
        } else {
            // Déplacement
            this.velocity.copy(direction).multiplyScalar(CONFIG.zombie.speed);
            this.mesh.position.add(this.velocity);
        }

        // Rotation vers le joueur
        const angle = Math.atan2(
            player.position.x - this.mesh.position.x,
            player.position.z - this.mesh.position.z
        );
        this.mesh.rotation.z = angle;
    }

    startBurning() {
        if (this.isBurning) return;
        this.isBurning = true;
        this.burnStartTime = Date.now();
        console.log('Zombie en feu !');

        // Créer des particules de feu
        for (let i = 0; i < 15; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff4400 : 0xffaa00,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Position aléatoire autour du zombie
            particle.position.set(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 1.5
            );

            // Vélocité aléatoire vers le haut
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                0.03 + Math.random() * 0.02,
                (Math.random() - 0.5) * 0.02
            );

            this.mesh.add(particle);
            this.fireParticles.push(particle);
        }

        // Effet visuel orange sur le zombie
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xff4400);
                child.material.emissiveIntensity = 0.6;
            }
        });
    }

    updateFireParticles() {
        this.fireParticles.forEach(particle => {
            // Déplacer la particule vers le haut
            particle.position.add(particle.userData.velocity);

            // Réduire l'opacité
            particle.material.opacity -= 0.02;

            // Réinitialiser la particule si elle devient invisible
            if (particle.material.opacity <= 0) {
                particle.position.set(
                    (Math.random() - 0.5) * 1.5,
                    0.2,
                    (Math.random() - 0.5) * 1.5
                );
                particle.material.opacity = 0.8;
            }
        });
    }

    stopBurning() {
        this.isBurning = false;

        // Retirer les particules de feu
        this.fireParticles.forEach(particle => {
            this.mesh.remove(particle);
        });
        this.fireParticles = [];

        // Rétablir l'apparence normale
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
            }
        });
    }

    attack() {
        damagePlayer(CONFIG.zombie.damage);
        // Animation visuelle d'attaque
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.5;
            }
        });
        setTimeout(() => {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
        }, 200);
    }

    takeDamage(damage) {
        this.health -= damage;
        // Feedback visuel de dégâts
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.8;
            }
        });
        setTimeout(() => {
            if (this.health > 0) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                });
            }
        }, 100);

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Nettoyer les particules de feu si le zombie brûle
        if (this.isBurning) {
            this.stopBurning();
        }

        // Jouer le son de mort du zombie
        if (zombieDieSound.buffer) {
            zombieDieSound.play();
        }

        scene.remove(this.mesh);
        const index = zombies.indexOf(this);
        if (index > -1) {
            zombies.splice(index, 1);
        }
        gameState.score++;
        updateUI();
    }
}

// Spawn initial de zombies (attendre que le modèle soit chargé)
function spawnZombies(count) {
    if (!zombieModelLoaded) {
        setTimeout(() => spawnZombies(count), 100);
        return;
    }

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const distance = 20 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const zombie = new Zombie(x, z);
        if (zombie.mesh) {
            zombies.push(zombie);
        }
    }
}

spawnZombies(10);

// Spawn continu de zombies
setInterval(() => {
    if (!gameState.isGameOver && zombies.length < 15 && zombieModelLoaded) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const zombie = new Zombie(x, z);
        if (zombie.mesh) {
            zombies.push(zombie);
        }
    }
}, 5000);

// ===== CONTROLS =====
const keys = {};
let mouseX = 0;
let mouseY = 0;
let isPointerLocked = false;

document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    mouseX -= e.movementX * 0.002;
    mouseY -= e.movementY * 0.002;
    mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));
});

document.addEventListener('click', () => {
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
});

// Fonction pour changer d'arme (cycle entre les 3 armes)
function switchWeapon() {
    camera.remove(currentWeaponMesh);

    if (gameState.currentWeapon === 'rifle') {
        gameState.currentWeapon = 'pistol';
        currentWeaponMesh = pistolWeapon;
        document.getElementById('weapon-indicator').textContent = 'Arme: PISTOLET';
        console.log('Changement vers pistolet');
    } else if (gameState.currentWeapon === 'pistol') {
        gameState.currentWeapon = 'flamethrower';
        currentWeaponMesh = flamethrowerWeapon;
        document.getElementById('weapon-indicator').textContent = 'Arme: LANCE-FLAMMES';
        console.log('Changement vers lance-flammes');
    } else {
        gameState.currentWeapon = 'rifle';
        currentWeaponMesh = rifleWeapon;
        document.getElementById('weapon-indicator').textContent = 'Arme: FUSIL D\'ASSAUT';
        console.log('Changement vers fusil');
    }

    camera.add(currentWeaponMesh);
}

// Tir avec la touche A, changement d'arme avec Z
document.addEventListener('keydown', (e) => {
    if (!isPointerLocked) return;

    if (e.code === 'KeyA') {
        shoot();
    } else if (e.code === 'KeyZ') {
        switchWeapon();
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
});

// ===== SHOOTING =====
function shoot() {
    if (!gameState.canShoot || gameState.isGameOver) return;

    gameState.canShoot = false;
    setTimeout(() => gameState.canShoot = true, CONFIG.weapon.cooldown);

    // Jouer le son de l'arme (nouvelle instance à chaque tir)
    playWeaponSound(gameState.currentWeapon);

    // Animation de recul de l'arme (plus réaliste)
    const originalPosZ = currentWeaponMesh.position.z;
    const originalPosY = currentWeaponMesh.position.y;
    const originalRotX = currentWeaponMesh.rotation.x;

    // Recul adapté selon l'arme
    let recoilAmount, recoilY;
    if (gameState.currentWeapon === 'rifle') {
        recoilAmount = 0.15;
        recoilY = 0.05;
    } else if (gameState.currentWeapon === 'pistol') {
        recoilAmount = 0.08;
        recoilY = 0.03;
    } else { // flamethrower
        recoilAmount = 0.05;
        recoilY = 0.02;
    }

    // Recul rapide
    currentWeaponMesh.position.z = originalPosZ + recoilAmount;
    currentWeaponMesh.position.y = originalPosY + recoilY;
    currentWeaponMesh.rotation.x = originalRotX - 0.1;

    // Retour progressif
    setTimeout(() => {
        currentWeaponMesh.position.z = originalPosZ + recoilAmount / 3;
        currentWeaponMesh.position.y = originalPosY + recoilY / 2;
        currentWeaponMesh.rotation.x = originalRotX - 0.03;
    }, 50);

    setTimeout(() => {
        currentWeaponMesh.position.z = originalPosZ;
        currentWeaponMesh.position.y = originalPosY;
        currentWeaponMesh.rotation.x = originalRotX;
    }, 150);

    // Effet visuel selon l'arme
    if (gameState.currentWeapon === 'flamethrower') {
        // Effet de flammes pour le lance-flammes avec particules
        const flameGroup = new THREE.Group();

        // Cône de flamme principal
        const flameGeometry = new THREE.ConeGeometry(0.15, 1.5, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.7
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(0, 0, -1.2);
        flameGroup.add(flame);

        // Particules de feu (30 particules)
        const flameParticles = [];
        for (let i = 0; i < 30; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4);
            const particleColor = Math.random() > 0.5 ? 0xff4400 : 0xffaa00;
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Position aléatoire dans le cône de flammes
            const distance = Math.random() * 1.5;
            const spread = distance * 0.3;
            particle.position.set(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread * 0.5,
                -0.8 - distance
            );

            flameGroup.add(particle);
            flameParticles.push(particle);
        }

        // Lueur orange à la sortie
        const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -0.8);
        flameGroup.add(glow);

        currentWeaponMesh.add(flameGroup);

        // Animation des particules
        let frameCount = 0;
        const animateFlame = () => {
            if (frameCount < 10) { // 10 frames d'animation
                flameParticles.forEach(particle => {
                    // Mouvement vers l'avant
                    particle.position.z -= 0.15;
                    // Expansion latérale
                    particle.position.x += (Math.random() - 0.5) * 0.05;
                    particle.position.y += (Math.random() - 0.5) * 0.05;
                    // Réduction de l'opacité
                    particle.material.opacity -= 0.08;
                });
                frameCount++;
                requestAnimationFrame(animateFlame);
            } else {
                currentWeaponMesh.remove(flameGroup);
            }
        };
        animateFlame();
    } else {
        // Flash du canon pour fusil et pistolet
        const flashGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        const muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        // Position du flash adapté selon l'arme
        const flashZ = gameState.currentWeapon === 'rifle' ? -1 : -0.5;
        muzzleFlash.position.set(0, 0.05, flashZ);
        currentWeaponMesh.add(muzzleFlash);

        setTimeout(() => {
            currentWeaponMesh.remove(muzzleFlash);
        }, 50);
    }

    // Raycasting pour détecter les zombies touchés
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Collecter tous les meshes des zombies
    const zombieMeshes = [];
    zombies.forEach(zombie => {
        if (zombie.mesh) {
            zombie.mesh.traverse((child) => {
                if (child.isMesh) {
                    zombieMeshes.push(child);
                }
            });
        }
    });

    // Collecter tous les meshes des arbres
    const treeMeshes = [];
    window.trees.forEach(tree => {
        if (!tree.userData.isDestroyed) {
            tree.traverse((child) => {
                if (child.isMesh) {
                    treeMeshes.push({ mesh: child, tree: tree });
                }
            });
        }
    });

    // Tester les intersections avec zombies et arbres
    const allTargets = [...zombieMeshes, ...treeMeshes.map(t => t.mesh)];
    const intersects = raycaster.intersectObjects(allTargets);

    if (intersects.length > 0) {
        // Vérifier si c'est un arbre
        const treeHit = treeMeshes.find(t => t.mesh === intersects[0].object);
        if (treeHit) {
            treeHit.tree.userData.health--;
            console.log(`Arbre touché ! Santé restante: ${treeHit.tree.userData.health}`);

            if (treeHit.tree.userData.health <= 0) {
                // Détruire l'arbre
                treeHit.tree.userData.isDestroyed = true;

                // Jouer le son de l'arbre qui tombe
                if (treeSound.buffer) {
                    treeSound.play();
                }

                // Retirer la collision de l'arbre
                if (treeHit.tree.userData.collisionIndex !== undefined) {
                    window.collisionObjects[treeHit.tree.userData.collisionIndex] = null;
                    console.log('✓ Collision de l\'arbre retirée');
                }

                // Appliquer une vélocité initiale (chute dans une direction aléatoire)
                const fallDirection = Math.random() * Math.PI * 2;
                treeHit.tree.userData.velocity.set(
                    Math.cos(fallDirection) * 0.02,
                    -0.05,
                    Math.sin(fallDirection) * 0.02
                );
                treeHit.tree.userData.angularVelocity = (Math.random() - 0.5) * 0.05;
                console.log('Arbre détruit ! Il tombe...');
            }
        } else {
            // Trouver le zombie parent du mesh touché
            let hitZombie = null;
            for (const zombie of zombies) {
                if (!zombie.mesh) continue;

                let found = false;
                zombie.mesh.traverse((child) => {
                    if (child === intersects[0].object) {
                        found = true;
                    }
                });
                if (found) {
                    hitZombie = zombie;
                    break;
                }
            }

            if (hitZombie) {
                hitZombie.takeDamage(CONFIG.weapon.damage);

                // Si c'est le lance-flammes, faire brûler le zombie
                if (gameState.currentWeapon === 'flamethrower') {
                    hitZombie.startBurning();
                }
            }
        }
    }
}

// ===== PLAYER DAMAGE =====
function damagePlayer(damage) {
    gameState.playerHealth -= damage;
    updateUI();

    // Jouer le son de coup
    if (touchSound.buffer && !touchSound.isPlaying) {
        touchSound.play();
    }

    // Effet visuel de dégâts
    renderer.domElement.style.filter = 'brightness(0.5)';
    setTimeout(() => {
        renderer.domElement.style.filter = 'brightness(1)';
    }, 100);

    if (gameState.playerHealth <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameState.isGameOver = true;

    // Jouer le son de mort
    if (dieSound.buffer) {
        dieSound.play();
    }

    document.getElementById('game-over').style.display = 'block';
    document.exitPointerLock();
}

// ===== UI UPDATE =====
function updateUI() {
    document.getElementById('score').textContent = `Zombies: ${gameState.score}`;
    const healthPercent = Math.max(0, (gameState.playerHealth / CONFIG.player.health) * 100);
    document.getElementById('health-fill').style.width = healthPercent + '%';
}

// ===== GAME LOOP =====
function animate() {
    requestAnimationFrame(animate);

    if (!gameState.isGameOver) {
        // Player rotation
        player.rotation.y = mouseX;
        camera.rotation.x = mouseY;

        // Player movement (flèches directionnelles) avec collision
        const moveVector = new THREE.Vector3();
        if (keys['ArrowUp']) moveVector.z -= 1;
        if (keys['ArrowDown']) moveVector.z += 1;
        if (keys['ArrowLeft']) moveVector.x -= 1;
        if (keys['ArrowRight']) moveVector.x += 1;

        const isMoving = moveVector.length() > 0;

        if (isMoving) {
            // Jouer le son de marche si le joueur est au sol et en mouvement
            if (isOnGround && walkSound.buffer && !walkSound.isPlaying) {
                walkSound.play();
            }

            moveVector.normalize();
            moveVector.applyQuaternion(player.quaternion);
            const movement = moveVector.multiplyScalar(CONFIG.player.speed);

            // Calculer la nouvelle position
            const newPos = player.position.clone().add(movement);

            // Vérifier la collision avec un rayon plus grand (0.8 au lieu de 0.5)
            const collisionRadius = 0.8;
            if (!checkCollision(newPos, collisionRadius)) {
                player.position.copy(newPos);
            } else {
                // Essayer le mouvement uniquement sur X
                const newPosX = player.position.clone();
                newPosX.x += movement.x;
                if (!checkCollision(newPosX, collisionRadius)) {
                    player.position.x = newPosX.x;
                }

                // Essayer le mouvement uniquement sur Z
                const newPosZ = player.position.clone();
                newPosZ.z += movement.z;
                if (!checkCollision(newPosZ, collisionRadius)) {
                    player.position.z = newPosZ.z;
                }
            }
        } else {
            // Arrêter le son de marche si le joueur ne bouge plus
            if (walkSound.isPlaying) {
                walkSound.stop();
            }
        }

        // Pousser le joueur hors du mur s'il est coincé
        pushPlayerOutOfWalls(player.position, 0.8);

        // Détecter le passage par les portes
        checkDoorPassage(player.position, 0.8);

        // Gravity and jump
        if (isOnGround) {
            playerVelocity.y = 0;
            if (keys['Space']) {
                playerVelocity.y = CONFIG.player.jumpForce;
                isOnGround = false;
            }
        } else {
            playerVelocity.y -= 0.02; // Gravity
        }

        player.position.add(playerVelocity);

        // Ground collision (simple)
        if (player.position.y <= CONFIG.player.height / 2) {
            player.position.y = CONFIG.player.height / 2;
            isOnGround = true;
        } else {
            isOnGround = false;
        }

        // Boundaries (zone plus large pour le nouveau collège)
        player.position.x = Math.max(-100, Math.min(100, player.position.x));
        player.position.z = Math.max(-100, Math.min(100, player.position.z));

        // Update zombies
        zombies.forEach(zombie => zombie.update());

        // Update arbres tombants
        if (window.trees) {
            window.trees.forEach(tree => {
            if (tree.userData.isDestroyed) {
                // Appliquer la gravité
                tree.userData.velocity.y -= 0.01;

                // Mettre à jour la position
                tree.position.add(tree.userData.velocity);

                // Rotation de chute
                tree.rotation.z += tree.userData.angularVelocity;

                // Arrêter la chute au sol
                if (tree.position.y < -3) {
                    tree.position.y = -3;
                    tree.userData.velocity.set(0, 0, 0);
                    tree.userData.angularVelocity = 0;
                }
            }
        });
        }

        // Animation de flottement des power-ups
        if (window.powerups) {
            window.powerups.forEach(powerup => {
                powerup.position.y = 1 + Math.sin(Date.now() * 0.003 + powerup.userData.floatOffset) * 0.3;
                powerup.rotation.y += 0.02;
            });
        }

        // Vérifier collision avec power-ups
        if (window.powerups) {
            for (let i = window.powerups.length - 1; i >= 0; i--) {
            const powerup = window.powerups[i];
            const distance = player.position.distanceTo(powerup.position);

            if (distance < 2) {
                // Power-up collecté !
                console.log('Power-up collecté ! Élimination des zombies proches...');

                // Retirer le power-up
                scene.remove(powerup);
                window.powerups.splice(i, 1);

                // Tuer tous les zombies dans un rayon de 15 unités
                const killRadius = 15;
                for (let j = zombies.length - 1; j >= 0; j--) {
                    const zombie = zombies[j];
                    if (zombie.mesh) {
                        const zombieDistance = player.position.distanceTo(zombie.mesh.position);
                        if (zombieDistance < killRadius) {
                            zombie.die();
                            console.log(`Zombie éliminé par power-up à ${zombieDistance.toFixed(1)}m`);
                        }
                    }
                }

                // Effet visuel de l'explosion
                const explosionGeometry = new THREE.SphereGeometry(killRadius, 16, 16);
                const explosionMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                });
                const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
                explosion.position.copy(player.position);
                scene.add(explosion);

                // Retirer l'effet après une courte durée
                setTimeout(() => {
                    scene.remove(explosion);
                }, 500);
            }
            }
        }
    }

    renderer.render(scene, camera);
}

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== START GAME =====
updateUI();
animate();
