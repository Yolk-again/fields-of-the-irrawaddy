import ctypes, ctypes.util, numpy as np, soundfile as sf
lib=ctypes.CDLL(ctypes.util.find_library('fluidsynth'))
P=ctypes.c_void_p
lib.new_fluid_settings.restype=P
lib.fluid_settings_setnum.argtypes=[P,ctypes.c_char_p,ctypes.c_double];lib.fluid_settings_setnum.restype=ctypes.c_int
lib.fluid_settings_setint.argtypes=[P,ctypes.c_char_p,ctypes.c_int];lib.fluid_settings_setint.restype=ctypes.c_int
lib.new_fluid_synth.argtypes=[P];lib.new_fluid_synth.restype=P
lib.fluid_synth_sfload.argtypes=[P,ctypes.c_char_p,ctypes.c_int];lib.fluid_synth_sfload.restype=ctypes.c_int
lib.fluid_synth_program_select.argtypes=[P,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int];lib.fluid_synth_program_select.restype=ctypes.c_int
lib.fluid_synth_noteon.argtypes=[P,ctypes.c_int,ctypes.c_int,ctypes.c_int];lib.fluid_synth_noteon.restype=ctypes.c_int
lib.fluid_synth_noteoff.argtypes=[P,ctypes.c_int,ctypes.c_int];lib.fluid_synth_noteoff.restype=ctypes.c_int
lib.fluid_synth_write_float.argtypes=[P,ctypes.c_int,P,ctypes.c_int,ctypes.c_int,P,ctypes.c_int,ctypes.c_int];lib.fluid_synth_write_float.restype=ctypes.c_int
settings=lib.new_fluid_settings(); sr=44100
lib.fluid_settings_setnum(settings,b'synth.sample-rate',sr)
lib.fluid_settings_setnum(settings,b'synth.gain',0.7)
lib.fluid_settings_setint(settings,b'synth.reverb.active',1)
lib.fluid_settings_setint(settings,b'synth.chorus.active',1)
synth=lib.new_fluid_synth(settings)
sfid=lib.fluid_synth_sfload(synth,b'/usr/share/sounds/sf2/TimGM6mb.sf2',1)
print('synth',synth,'sfid',sfid)
print('program',lib.fluid_synth_program_select(synth,0,sfid,0,24))
lib.fluid_synth_noteon(synth,0,67,90)
N=sr*1
l=np.zeros(N,dtype=np.float32);r=np.zeros(N,dtype=np.float32)
ret=lib.fluid_synth_write_float(synth,N,l.ctypes.data,0,1,r.ctypes.data,0,1)
print('ret',ret, l.min(),l.max(), np.sqrt(np.mean(l*l)))
lib.fluid_synth_noteoff(synth,0,67)
N2=sr//2;l2=np.zeros(N2,dtype=np.float32);r2=np.zeros(N2,dtype=np.float32)
lib.fluid_synth_write_float(synth,N2,l2.ctypes.data,0,1,r2.ctypes.data,0,1)
a=np.column_stack([np.concatenate([l,l2]),np.concatenate([r,r2])])
sf.write('/mnt/data/hm_audio_work/test.wav',a,sr)
