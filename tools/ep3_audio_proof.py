import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "informe" / "audio_ep3"


def read_json(path):
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


wav = AUDIO / "pregunta_voip.wav"
mp3 = AUDIO / "respuesta_tts.mp3"
stt_error = read_json(AUDIO / "stt_response.json")
ia = read_json(AUDIO / "ia_audio_response.json")

def clean(text):
    text = str(text).replace("\n", " ")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join(text.split())


print("EP3 ITEM 3 - PRUEBA REAL AUDIO / STT / IA / TTS")
print(f"Audio entrada WAV bytes : {wav.stat().st_size}")
print("Audio entrada contenido : voz sintetizada preguntando por VoIP y PSTN")
print(f"ElevenLabs intento STT  : {stt_error.get('detail', {}).get('status')}")
print("ElevenLabs mensaje      : Free Tier disabled / unusual activity")
print("STT fallback real       : Google Web Speech via SpeechRecognition")
print(f"Transcripcion STT       : {clean(ia['transcript'])}")
print("IA real                 : OpenRouter / openai/gpt-oss-20b:free")
print(f"Respuesta IA preview    : {clean(ia['answer'])[:210]}")
print("TTS real                : Microsoft Edge online TTS via edge-tts")
print(f"Audio salida MP3 bytes  : {mp3.stat().st_size}")
print(f"Archivo salida MP3      : {mp3.name}")
