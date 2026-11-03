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

- `dist/orbits.js`: JPL-element planet positions and state-vector Kepler propagation.

- `dist/planets.json`, `dist/moons.json`, `dist/satellite-ephemerides.json`: modular body data and epoch state vectors.

- `dist/assets`: separately exported GLB objects.

- `dist/textures`: image maps and derived material maps.



`interactableObjects` contains Sun, planet and moon meshes, each with its own `userData.onClick` handler. Navigation and moon buttons offer keyboard-accessible selection. Use Follow to inspect an object, drag to change viewing angle, and Overview to return. Orbit lines are white. Moons and labels can be toggled.



## Included moon systems



Earth: Moon. Mars: Phobos, Deimos. Jupiter: Io, Europa, Ganymede, Callisto. Saturn: Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus. Uranus: Ariel, Umbriel, Titania, Oberon, Miranda. Neptune: Triton, Proteus, Nereid. Mercury and Venus have no moons. This is a selected set of 22, not the complete known satellite catalogue.



## Scientific scope



Planet distances, mean speeds, periods and eccentricities: NASA Planetary Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/.

Moon semimajor axes, periods, eccentricities and inclinations: JPL Planetary Satellite Mean Elements, https://ssd.jpl.nasa.gov/sats/elem/, retrieved November 1, 2026. JPL cautions that mean elements are descriptive and are not ephemerides.



Planet positions use the JPL approximate Keplerian elements and rates valid from 1800 through 2050: https://ssd.jpl.nasa.gov/planets/approx_pos.html. They are approximate heliocentric positions, not full Horizons integrations. The Earth element is for the Earth-Moon barycentre; the displayed and reported Earth-centre position subtracts the Moon's geocentric vector times the Moon/Earth-Moon mass ratio. Planet vectors are expressed in the ecliptic J2000 frame.

The Moon and Titan start from JPL Horizons geometric state vectors at J2000.0, queried relative to Earth and Saturn respectively, in the ecliptic J2000 frame. Their two-body Kepler orbits use JPL mean periods as a baseline (27.321661 and 15.945448 days). Titan's mean motion is fitted to a second Horizons vector at 2028-07-05 00:00 TDB, using its JPL mean period to resolve the intervening orbit count; the resulting effective period is 15.945392925 days. This improves the requested spot-check phase but does not reproduce N-body perturbations or guarantee the same residual at other dates. The other 20 selected moons use JPL mean periods and eccentricities, but retain simplified starting phases and orbital orientations. All moon distances are compressed for display. See `dist/satellite-ephemerides.json` for the state vectors, periods, gravitational parameters, calibration vector, and source epoch.

The date/time field is interpreted in the browser's local time zone, converted to UTC, then to TDB for the ephemeris calculations. The adjacent `UTC±hh:mm` label reflects the selected date's local offset, including daylight-saving changes. The date slider scrubs continuously; setting a date/time pauses playback. Historical UTC-to-TDB conversion before 1972 uses a ΔT polynomial approximation; dates from 1972 onward use the leap-second table and the standard TDB−TT periodic correction.

For an arbitrary instant, open the browser developer console after the scene loads and run `window.solarSystem.ephemerisAt(new Date('2028-07-04T23:58:50.816Z'))`. The returned planet coordinates are heliocentric AU in ecliptic J2000; `titanRelativeToSaturnKm` is the Saturn-centred Titan vector in km. Compare with geometric Horizons vectors using center `500@10` for planets and `500@699` for Titan, `REF_PLANE='ECLIPTIC'`, `REF_SYSTEM='J2000'`, and matching TDB time. The date, frame, time scale, and origin must match for a meaningful comparison.

### JPL spot check — 2028-07-05 00:00 TDB

Horizons geometric vectors use JDTDB 2461957.5, ecliptic J2000.0, with the Sun as centre for Earth/Saturn and Saturn as centre for Titan. The app values below use the same frame and epoch; planet values are from JPL's approximate element model, and Titan uses its calibrated two-body orbit.

| Body | App position | JPL Horizons position | Position error |
|---|---|---|---:|
| Earth (AU) | (0.230727399, -0.990145468, 0.000061871) | (0.230650792, -0.990168575, 0.000065023) | 11,980 km |
| Saturn (AU) | (7.728394277, 5.075057942, -0.395749461) | (7.730807011, 5.063047269, -0.395903430) | 1,832,811 km |
| Titan relative to Saturn (km) | (-993,847, 717,873, -273,054) | (-991,200, 716,815, -270,864) | 3,595 km |

These are position-vector differences, not visual-scale distances. The Earth and Saturn residuals are expected limitations of the JPL approximate planetary elements; use Horizons directly when high-precision planetary positions are required. The Titan calibration improves the specified reference epoch, but dates away from that anchor still use a two-body approximation.

The `radius` and `orbit` fields in `planets.json` and `moons.json` are compressed display units, not physical radii or distances. NASA Fact Sheet values provide semimajor axes (million km), mean orbital speeds (km/s), sidereal periods (Earth days), and volumetric mean radii (`physicalRadiusKm`). No N-body dynamics or precession is simulated. The information panel shows NASA sidereal rotation periods.

The mobile renderer uses a higher pixel-ratio cap (2×) and disables multisample rendering on phones/coarse-pointer devices to keep text and planets sharp while reducing GPU cost. During object follow, click “Unlock camera” or right-drag to release the target and pan; touch devices can use the visible unlock button before panning.


The date controls select a UTC calendar day and initially open at the current date. The speed control advances the shared simulation clock at 0.25 Earth days per second by default; selecting a date pauses motion. Planet and moon orbits advance by the same simulated Earth-day interval, though moon phases at any date remain illustrative. Planet spin rates follow NASA sidereal periods and stop when simulation time is paused. Starting prime-meridian phases and exact pole orientations are simplified. Playback stops at the end of the JPL element range in 2050. Moon surfaces keep an illustrative three-minute spin independent of orbital phase. The information panel shows NASA sidereal rotation periods.



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
