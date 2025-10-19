#!/usr/bin/env python3
"""
Script Blender pour ajouter des murs d'enceinte autour du collège
"""
import bpy
import os
import sys

# Chemins des fichiers
INPUT_GLB = "/home/lexoyo/_/tmp/paul/zombie-claude/public/college_revesz_long_simplified.glb"
OUTPUT_GLB = "/home/lexoyo/_/tmp/paul/zombie-claude/public/college_revesz_long_with_wall.glb"
BRICK_TEXTURE = "/home/lexoyo/_/tmp/paul/zombie-claude/public/brick_texture_1024.png"

def clear_scene():
    """Nettoyer la scène Blender"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Nettoyer les matériaux orphelins
    for material in bpy.data.materials:
        if not material.users:
            bpy.data.materials.remove(material)

def import_glb(filepath):
    """Importer le fichier GLB"""
    print(f"Importation de {filepath}...")
    bpy.ops.import_scene.gltf(filepath=filepath)
    print("✓ Fichier GLB importé")

def get_scene_bounds():
    """Calculer les limites de tous les objets de la scène"""
    import mathutils
    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Obtenir la bounding box dans les coordonnées globales
            for v in obj.bound_box:
                world_co = obj.matrix_world @ mathutils.Vector(v)
                min_x = min(min_x, world_co.x)
                max_x = max(max_x, world_co.x)
                min_y = min(min_y, world_co.y)
                max_y = max(max_y, world_co.y)
                min_z = min(min_z, world_co.z)
                max_z = max(max_z, world_co.z)

    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    width = max_x - min_x
    depth = max_y - min_y
    height = max_z - min_z

    print(f"Dimensions du bâtiment:")
    print(f"  Centre: ({center_x:.2f}, {center_y:.2f})")
    print(f"  Largeur (X): {width:.2f}m")
    print(f"  Profondeur (Y): {depth:.2f}m")
    print(f"  Hauteur (Z): {height:.2f}m")
    print(f"  Limites X: {min_x:.2f} à {max_x:.2f}")
    print(f"  Limites Y: {min_y:.2f} à {max_y:.2f}")

    return {
        'center': (center_x, center_y),
        'min': (min_x, min_y, min_z),
        'max': (max_x, max_y, max_z),
        'width': width,
        'depth': depth,
        'height': height
    }

def create_brick_material(texture_path):
    """Créer un matériau avec la texture de briques"""
    mat = bpy.data.materials.new(name="BrickWall")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Nettoyer les nodes par défaut
    nodes.clear()

    # Créer les nodes
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (400, 0)

    principled_node = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled_node.location = (0, 0)
    principled_node.inputs['Roughness'].default_value = 0.9
    principled_node.inputs['Metallic'].default_value = 0.0

    # Charger la texture
    tex_image_node = nodes.new(type='ShaderNodeTexImage')
    tex_image_node.location = (-400, 0)

    if os.path.exists(texture_path):
        tex_image_node.image = bpy.data.images.load(texture_path)
        print(f"✓ Texture de briques chargée: {texture_path}")
    else:
        print(f"⚠ Texture non trouvée: {texture_path}")
        print("  Utilisation d'une couleur de brique par défaut")
        principled_node.inputs['Base Color'].default_value = (0.66, 0.33, 0.27, 1.0)

    # Mapping pour contrôler l'échelle de la texture
    mapping_node = nodes.new(type='ShaderNodeMapping')
    mapping_node.location = (-600, 0)
    mapping_node.inputs['Scale'].default_value = (4, 4, 4)  # Répéter la texture

    tex_coord_node = nodes.new(type='ShaderNodeTexCoord')
    tex_coord_node.location = (-800, 0)

    # Connecter les nodes
    links.new(tex_coord_node.outputs['UV'], mapping_node.inputs['Vector'])
    links.new(mapping_node.outputs['Vector'], tex_image_node.inputs['Vector'])
    links.new(tex_image_node.outputs['Color'], principled_node.inputs['Base Color'])
    links.new(principled_node.outputs['BSDF'], output_node.inputs['Surface'])

    return mat

def create_wall(name, location, dimensions, material):
    """Créer un mur avec des coordonnées UV"""
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=location
    )
    wall = bpy.context.active_object
    # IMPORTANT : Nommer le mesh, pas juste l'objet
    wall.name = name
    if wall.data:
        wall.data.name = name
    wall.scale = dimensions

    # Appliquer la transformation pour que les dimensions soient réelles
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Assigner le matériau
    if wall.data.materials:
        wall.data.materials[0] = material
    else:
        wall.data.materials.append(material)

    # Générer les coordonnées UV si nécessaire
    if not wall.data.uv_layers:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=66, island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')

    print(f"✓ Mur créé: {name} à {location} (dimensions: {dimensions})")
    return wall

def create_enclosure_walls(bounds, material):
    """Créer les 4 murs d'enceinte"""
    center_x, center_y = bounds['center']
    width = bounds['width']
    depth = bounds['depth']
    min_z = bounds['min'][2]

    # Paramètres des murs
    wall_height = 6.0
    wall_thickness = 1.0
    margin = 0.5  # Marge réduite pour coller au sol (0.5m au lieu de 5m)

    # Calculer les dimensions de l'enceinte
    enclosure_width = width + 2 * margin
    enclosure_depth = depth + 2 * margin

    print(f"\nCréation de l'enceinte:")
    print(f"  Dimensions: {enclosure_width:.2f}m x {enclosure_depth:.2f}m")
    print(f"  Hauteur des murs: {wall_height}m")
    print(f"  Épaisseur: {wall_thickness}m")
    print(f"  Position Z du sol: {min_z:.2f}m")

    walls = []

    # Position verticale : le bas du mur touche le sol
    wall_z = min_z + wall_height/2

    # Mur Nord (le long de l'axe X, côté Y+)
    wall_north = create_wall(
        name="Wall_North",
        location=(center_x, center_y + enclosure_depth/2, wall_z),
        dimensions=(enclosure_width, wall_thickness, wall_height),
        material=material
    )
    walls.append(wall_north)

    # Mur Sud (le long de l'axe X, côté Y-)
    wall_south = create_wall(
        name="Wall_South",
        location=(center_x, center_y - enclosure_depth/2, wall_z),
        dimensions=(enclosure_width, wall_thickness, wall_height),
        material=material
    )
    walls.append(wall_south)

    # Mur Est (le long de l'axe Y, côté X+)
    wall_east = create_wall(
        name="Wall_East",
        location=(center_x + enclosure_width/2, center_y, wall_z),
        dimensions=(wall_thickness, enclosure_depth, wall_height),
        material=material
    )
    walls.append(wall_east)

    # Mur Ouest (le long de l'axe Y, côté X-)
    wall_west = create_wall(
        name="Wall_West",
        location=(center_x - enclosure_width/2, center_y, wall_z),
        dimensions=(wall_thickness, enclosure_depth, wall_height),
        material=material
    )
    walls.append(wall_west)

    return walls

def export_glb(filepath):
    """Exporter la scène en GLB"""
    print(f"\nExportation vers {filepath}...")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_materials='EXPORT',
        export_texcoords=True,
        export_normals=True,
        export_yup=True
    )
    print(f"✓ Fichier exporté: {filepath}")

def main():
    """Fonction principale"""
    print("=" * 60)
    print("AJOUT DE MURS D'ENCEINTE AU COLLÈGE")
    print("=" * 60)

    # 1. Nettoyer la scène
    clear_scene()

    # 2. Importer le GLB
    import_glb(INPUT_GLB)

    # 3. Analyser les dimensions
    bounds = get_scene_bounds()

    # 4. Créer le matériau de briques
    brick_material = create_brick_material(BRICK_TEXTURE)

    # 5. Créer les murs d'enceinte
    walls = create_enclosure_walls(bounds, brick_material)

    # 6. Exporter le résultat
    export_glb(OUTPUT_GLB)

    print("\n" + "=" * 60)
    print("TERMINÉ !")
    print(f"Fichier créé: {OUTPUT_GLB}")
    print(f"Nombre de murs ajoutés: {len(walls)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
