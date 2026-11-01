# Orbital Atlas вЂ” realistic materials edition



Project home: C:\Users\alexk\SolarSystem\SolarSystem3DViz



## Run and edit



Run `python -m http.server 8765 --directory dist`, then open http://localhost:8765.

Open `Solar System.blend` to edit the Blender scene. Rebuild its assets with:



`blender --background --factory-startup --python build_blender.py`



The Blender file retains subdivision modifiers, subtle rocky displacement, physical surface material nodes, independent rotation, animated planet and moon orbits, solar emission/prominences and emissive background stars. All image maps are packed into the file. The glTF exports have modifiers evaluated; Blender node networks are supplemented with equivalent browser material effects in materials.js and effects.js.



## Modules



- `dist/app.js`: scene, camera, picking, bloom, controls and independent animation clocks.

- `dist/materials.js`: planet materials, ocean roughness, clouds, Earth night lights, atmospheric rims and rings.

- `dist/effects.js`: animated solar granulation, corona, prominence loops and luminous stars.

- `dist/orbits.js`: Kepler solver and focus-centered elliptical positions.

- `dist/planets.json`, `dist/moons.json`: modular body and orbit data.

- `dist/assets`: separately exported GLB objects.

- `dist/textures`: image maps and derived material maps.



`interactableObjects` contains Sun, planet and moon meshes, each with its own `userData.onClick` handler. Navigation and moon buttons offer keyboard-accessible selection. Use Follow to inspect an object, drag to change viewing angle, and Overview to return. Orbit lines are white. Moons and labels can be toggled.



## Included moon systems



Earth: Moon. Mars: Phobos, Deimos. Jupiter: Io, Europa, Ganymede, Callisto. Saturn: Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus. Uranus: Ariel, Umbriel, Titania, Oberon, Miranda. Neptune: Triton, Proteus, Nereid. Mercury and Venus have no moons. This is a selected set of 22, not the complete known satellite catalogue.



## Scientific scope



Planet distances, mean speeds, periods and eccentricities: NASA Planetary Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/.

Moon semimajor axes, periods, eccentricities and inclinations: JPL Planetary Satellite Mean Elements, https://ssd.jpl.nasa.gov/sats/elem/, retrieved November 1, 2026. JPL cautions that mean elements are descriptive and are not ephemerides.



Planet positions for the selected date use JPL approximate Keplerian elements and rates valid from 1800 through 2050: https://ssd.jpl.nasa.gov/planets/approx_pos.html. These are approximate heliocentric positions, not high-precision Horizons ephemerides; Earth uses the Earth-Moon barycentre elements. Sizes and orbital distances are independently compressed for display. Moon orbital phases and orientations remain illustrative because mean elements do not provide epoch-specific positions. Moon reference planes are simplified to parent equators except Earth and Nereid. Inclination greater than 90 degrees makes Triton retrograde. No N-body dynamics or precession is simulated.



The date slider selects a UTC calendar day and initially opens at the current date. The speed control advances the shared simulation clock at 0.25 Earth days per second by default (160 times slower than the previous 40 days/sec); selecting a date pauses motion. Planet and moon orbits then advance by the same simulated Earth-day interval, though moon phases at any date remain illustrative. Playback stops at the end of the JPL element range in 2050. Pause and speed zero hold orbital positions while gentle axial rotation and solar plasma effects continue. Planet surface turns take 2–6 minutes, scaled illustratively from real rotation periods; moon surfaces turn every three minutes. These visual spins are not physically synchronized or tidally locked. The information panel continues to show real orbital and sidereal periods.



Sun colours and prominence loops are artistic plasma effects. Illumination is display-balanced rather than photometrically calibrated. Roughness and relief are illustrative material detail, not measured elevation. 19 of the 22 moons use spacecraft-based image maps. Titan uses atmospheric haze; Proteus and Nereid remain artistic reconstructions. Mosaic coverage and resolution vary; derived bump detail is not measured topography. Neptune's map uses enhanced blue coloration.



## Asset credits



Planet, Sun, Moon, Earth clouds/night lights and Saturn ring maps: Solar System Scope / INOVE, https://www.solarsystemscope.com/textures/, based on NASA imagery, licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/.

Changes: Earth day map resized from 8K to 4K; ocean roughness and cloud-alpha maps derived; maps shaded with additional atmosphere and lighting effects. Attribution also appears in the app's About dialog.

Three.js 0.180.0: MIT license in dist/vendor/THREE-LICENSE.txt.



## Local folders



`work` holds preparation and publication intermediates, including a separate Sites checkout. `outputs` holds preview images and the downloadable project archive. The root GitHub remote is preserved. `work/previous-site-git` retains the earlier Sites repository history.



## Moons and environmental layers



Moon maps: NASA/JPL Solar System Simulator texture archive, https://space.jpl.nasa.gov/tmaps/. Viking/Voyager mosaics have gaps and aesthetic enhancements; they are visualization assets, not scientific analysis products. Exact source URLs and credits are retained in dist/moon-map-sources.json.

Enceladus: Paul Schenk / Lunar and Planetary Institute, Cassini ISS NASA/JPL, https://www.lpi.usra.edu/icy_moons/saturn/enceladus/ (CC BY 4.0). Resized to 2048 x 1024.



The main asteroid belt is between Mars and Jupiter: https://science.nasa.gov/solar-system/asteroids/facts/. The Kuiper Belt is icy small bodies beyond Neptune, with its main region around 30–50 AU: https://science.nasa.gov/solar-system/kuiper-belt/facts/.

Zodiacal dust is diffuse material close to the solar-system plane: https://www.nasa.gov/solar-system/what-scientists-found-after-sifting-through-dust-in-the-solar-system/.

The gas layer represents Enceladus's water-vapour torus near its orbit around Saturn, supported by https://www.nature.com/articles/s41550-023-02009-6. The separate icy E ring and south-polar plume are described at https://science.nasa.gov/missions/cassini/put-a-ring-on-it/.



Belts contain 2,700 representative bodies, not a catalogue of individual asteroids. Sizes, spacing, dust density, gas colour and opacity are enhanced for visibility; display distances are compressed. No large colourful nebula is placed in the planetary system. Layers & sources in the app records placements and limitations. Belts and Dust / gas can be toggled independently.



refine_moons.py updates moon materials and isolated GLB assets; environment_blender.py creates editable environmental collections. The main builder calls both, preserving these improvements on regeneration. dist/environment.js handles browser layers; environment-data.json stores deterministic sample bodies.


## Clickable close-ups

35 bodies: see CLICKABLE-OBJECTS.txt. Body clicks select, centre, zoom and follow. Ceres, Vesta, Pallas and Hygiea have clickable signs. Their surfaces, sizes, positions and animation periods are illustrative. Fine gas particles and a gently flowing Enceladus plume replace large blurred gas points. Moon spin is 180 seconds, even with orbital pause. named_objects_blender.py updates Blender bodies and signs.

## Music and Escape menu

Press Escape or Menu to open the pause menu. Resume restores the prior orbital pause state; Settings provides music on/off and volume saved locally. The menu holds all scene animation, including camera travel, while background music may continue. Browser playback starts on the first interaction; Play music retries blocked playback. Lightless Dawn by Kevin MacLeod, CC BY 4.0; credit/source in Settings and dist/audio/ATTRIBUTION.txt. The user-supplied recording is unchanged and repeats for background playback.

## Atmosphere and chemistry
Select a body, then use Atmosphere & chemistry. Reference data and direct NASA source links are in dist/atmospheres.json. Percentages are by volume where stated, not mass. Exospheres, plume gases and solar plasma use qualitative entries; uncurated bodies explicitly show a data gap. This is not a live measurement. Escape closes the panel.
