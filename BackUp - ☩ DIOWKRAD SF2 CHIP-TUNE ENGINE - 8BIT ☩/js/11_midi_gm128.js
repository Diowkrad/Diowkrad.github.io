/* ============================================================
   ФАЙЛ 11/13: 11_midi_gm128.js
   Секция: MIDI GM × 128 — синтез по рецептам (v1.1.1 «GLOBAL MIDI»)
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ MIDI GM × 128 — синтез по рецептам (v1.1.1 «GLOBAL MIDI») ============ */
const GMN=["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet", "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer", "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion", "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)", "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics", "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2", "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani", "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit", "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2", "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet", "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina", "Square Lead", "Saw Lead", "Calliope Lead", "Chiff Lead", "Charang", "Voice Lead", "Fifth Saw Lead", "Bass & Lead", "New Age Pad", "Warm Pad", "Polysynth Pad", "Choir Pad", "Bowed Pad", "Metallic Pad", "Halo Pad", "Sweep Pad", "Rain", "Soundtrack", "Crystal", "Atmosphere", "Brightness", "Goblins", "Echoes", "Sci-Fi", "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai", "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal", "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"];
const FAMS_RNG=[[0, "Piano"], [8, "Chromatic Percussion"], [16, "Organ"], [24, "Guitar"], [32, "Bass"], [40, "Strings"], [48, "Ensemble"], [56, "Brass"], [64, "Reed"], [72, "Pipe"], [80, "Synth Lead"], [88, "Synth Pad"], [96, "Synth Effects"], [104, "Ethnic"], [112, "Percussive"], [120, "Sound Effects"]];
const R={"0":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":7500,"br":1},"1":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":0.9,"s":0,"r":0.165,"cut":9000,"br":1},"2":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.006,"d":1.0,"s":0,"r":0.165,"cut":6500,"br":1},"3":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5500,"br":1,"lvl":0.85},"4":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5200,"br":1},"5":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.2],[6,0.12]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5600,"br":1},"6":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":0.6,"s":0,"r":0.165,"cut":7000,"br":1},"7":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.004,"d":0.7,"s":0,"r":0.165,"cut":5200,"br":1},"8":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"9":{"w":"sine","p":[[1,1],[4,0.3]],"a":0.002,"d":1.1,"s":0,"r":0.1375,"cut":9500,"br":1},"10":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"11":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"12":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"13":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"14":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":1.6,"s":0,"r":0.22,"cut":9000,"br":1},"15":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"16":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"17":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"18":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"19":{"w":"sine","p":[[1,1],[2,0.55],[3,0.4],[4,0.3],[6,0.22],[8,0.16]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":7000},"20":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"21":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"22":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"23":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"24":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"25":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"26":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"27":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"28":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"29":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"30":{"w":"square","p":[[1,1],[2,0.6]],"a":0.003,"d":0.8,"s":0,"r":0.154,"cut":3000,"br":1,"noise":0.3},"31":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"32":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"33":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"34":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"35":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"36":{"w":"square","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.003,"d":0.3,"s":0.1,"r":0.154,"cut":2400,"br":0.6},"37":{"w":"square","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.35,"s":0.1,"r":0.154,"cut":2600,"br":0.6},"38":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"39":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"40":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"41":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"42":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"43":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"44":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"45":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.15,"s":0.8,"r":0.11,"cut":4200,"br":0.6,"det":7},"46":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"47":{"w":"sawtooth","p":[[1,1]],"a":0.09,"d":1.2,"s":0.15,"r":0.22,"cut":3000,"br":0.6,"det":7,"noise":0.6,"lvl":0.9},"48":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"49":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"50":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"51":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"52":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.22]],"a":0.35,"d":0.18,"s":0.9,"r":0.33,"cut":3800,"det":14,"br":0.7},"53":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"54":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"55":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"56":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.03,"d":0.15,"s":0.6,"r":0.154,"cut":3800,"br":0.8},"57":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"58":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"59":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"60":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"61":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.05,"d":0.15,"s":0.75,"r":0.154,"cut":3800,"br":0.8},"62":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"63":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"64":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"65":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"66":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"67":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"68":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"69":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"70":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"71":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"72":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"73":{"w":"sine","p":[[1,1],[2,0.15],[3,0.05]],"a":0.03,"d":0.1,"s":0.9,"r":0.165,"cut":6500},"74":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"75":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"76":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"77":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"78":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"79":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"80":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"81":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"82":{"w":"square","p":[[1,1],[2,0.45],[3,0.3]],"a":0.01,"d":0.1,"s":0.75,"r":0.1375,"cut":5200,"br":1},"83":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"84":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"85":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"86":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"87":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"88":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"89":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"90":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"91":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.4,"d":0.3,"s":0.92,"r":0.385,"cut":3200,"det":16,"br":0.5},"92":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"93":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"94":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"95":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"96":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"97":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"98":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"99":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"100":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"101":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"102":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"103":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"104":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"105":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"106":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"107":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"108":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"109":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0.85,"r":0.165,"cut":6000,"br":1,"noise":0.25,"det":10},"110":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"111":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"112":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"113":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"114":{"w":"sine","p":[[1,1],[2.8,0.3]],"a":0.002,"d":0.8,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"115":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"116":{"w":"sine","p":[[1,1],[2,0.3]],"a":0.002,"d":0.5,"s":0,"r":0.1375,"cut":2600,"noise":1,"br":0.9,"lvl":1.1},"117":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"118":{"w":"square","p":[[1,1],[2,0.5]],"a":0.002,"d":0.4,"s":0,"r":0.1375,"cut":5000,"noise":0.4,"br":0.9},"119":{"w":"sine","p":[[1,1]],"a":0.4,"d":0.3,"s":0.7,"r":0.33,"cut":6000,"noise":1,"br":0.9},"120":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"121":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"122":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"123":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"124":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"125":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"126":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"127":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.002,"d":0.12,"s":0,"r":0.033,"cut":3000,"noise":1,"lvl":1.2}};
let midiProg=0;
const midiGet=p=>R[String(p)]||R['0'];
function midiOn(k,vel=100){
  ensureAudio();
  if(activeMidi.has(k)) midiKill(k);
  
  /* ИСПРАВЛЕНИЕ: Безопасный лимит полифонии (замена VOICE_MAX на жесткое число, если константа недоступна) */
  const limit = (typeof VOICE_MAX !== 'undefined') ? VOICE_MAX : 32;
  if(activeMidi.size >= limit){ const k0=activeMidi.keys().next().value; midiKill(k0); }
  
  const rec=midiGet(midiProg);
  const t=audioCtx.currentTime;
  const f=freqOf(k);
  const v=Math.max(0.06,Math.min(1,(vel||100)/127));
  const A=rec.a||0.01, D=Math.max(rec.d||0.3,0.01), S=(rec.s==null?0.5:rec.s), Rr=rec.r||0.2;
  const peak=0.24*(0.35+0.65*v)*(rec.lvl||1);
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+A);
  g.gain.setTargetAtTime(Math.max(peak*S,0.0001),t+A,D);
  const lp=rec.cut?audioCtx.createBiquadFilter():null;
  if(lp){ lp.type='lowpass'; lp.frequency.value=rec.cut*(rec.br?0.55+0.45*v:1); }
  const nodes=[];
  
  for(const pr of rec.p){
    const osc=audioCtx.createOscillator();
    osc.type=rec.w||'sine';
    
    /* ИСПРАВЛЕНИЕ: Учитываем текущий Pitch Bend (bendCents) прямо в момент взятия ноты */
    const currentBend = (typeof bendCents !== 'undefined') ? bendCents : 0;
    osc.frequency.value = f * pr[0] * Math.pow(2, currentBend / 1200);
    
    if(rec.det) osc.detune.value=((pr[0]%2)?1:-1)*rec.det;
    const og=audioCtx.createGain(); og.gain.value=pr[1];
    osc.connect(og); og.connect(lp||g); osc.start(t); nodes.push(osc);
  }
  if(rec.noise){
    const ns=audioCtx.createBufferSource(); ns.buffer=noiseBuffer('long'); ns.loop=true;
    const ng=audioCtx.createGain(); ng.gain.value=rec.noise;
    ns.connect(ng); ng.connect(lp||g); ns.start(t); nodes.push(ns);
  }
  if(lp) lp.connect(g);
  g.connect(master);
  
  /* ИСПРАВЛЕНИЕ: Сохраняем базовую частоту f и коэффициенты гармоник pr[0] для динамического Pitch Bend */
  activeMidi.set(k,{g,nodes,Rr,f,ratios: rec.p.map(pr=>pr[0]),st:performance.now()});
  hl(k,true); updVoices();
  if(S===0){ /* перкуссивные и щипковые затухают сами */
    const end=t+A+D*6+Rr*2;
    nodes.forEach(n=>{try{n.stop(end);}catch(_){}});
  }
}
function midiOff(k){
  const v=activeMidi.get(k); if(!v) return;
  const t=audioCtx.currentTime, Rr=v.Rr;
  try{v.g.gain.cancelScheduledValues(t);}catch(_){}
  try{v.g.gain.setValueAtTime(v.g.gain.value||0.0001,t);}catch(_){}
  v.g.gain.setTargetAtTime(0,t,Math.max(Rr/3,0.01));
  v.nodes.forEach(n=>{try{n.stop(t+Rr*2+0.1);}catch(_){}});
  activeMidi.delete(k); hl(k,false);
  setTimeout(()=>{try{v.g.disconnect();}catch(_){}},Rr*2000+120);
  updVoices();
}
function midiKill(k){
  const v=activeMidi.get(k); if(!v) return;
  const t=audioCtx.currentTime;
  try{v.g.gain.cancelScheduledValues(t);}catch(_){}
  try{v.g.gain.setValueAtTime(v.g.gain.value||0.0001,t);}catch(_){}
  v.g.gain.setTargetAtTime(0,t,0.008);
  v.nodes.forEach(n=>{try{n.stop(t+0.05);}catch(_){}});
  activeMidi.delete(k); hl(k,false);
  setTimeout(()=>{try{v.g.disconnect();}catch(_){}},80);
  updVoices();
}
function buildMidiSel(){
  const sel=document.getElementById('midiVoiceSel'); if(!sel) return;
  sel.innerHTML='';
  FAMS_RNG.forEach((fr,i)=>{
    const og=document.createElement('optgroup'); og.label=fr[1];
    const nxt=FAMS_RNG[i+1]?FAMS_RNG[i+1][0]:128;
    for(let p=fr[0];p<nxt;p++){
      const o=document.createElement('option'); o.value=String(p);
      o.textContent=(p+1)+'. '+GMN[p];
      og.appendChild(o);
    }
    sel.appendChild(og);
  });
  sel.value='0';
}
$('#midiVoiceSel').addEventListener('change',e=>{
  midiProg=+e.target.value||0;
  lcd('MODE: [MIDI GM] — Голос: ['+GMN[midiProg]+']');
  if(state.mode!=='midi') setMode('midi'); else log('Голос MIDI: '+GMN[midiProg]);
});
