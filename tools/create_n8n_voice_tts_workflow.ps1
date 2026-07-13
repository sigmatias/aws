param(
    [string]$BaseUrl = "https://3.219.120.166.nip.io",
    [string]$Email = "mat.oyanedel@duocuc.cl",
    [Parameter(Mandatory=$true)] [string]$Password,
    [string]$OpenRouterCredentialId = "Q4cDx1CSIzyAnAyy"
)

$ErrorActionPreference = "Stop"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = @{
    emailOrLdapLoginId = $Email
    password = $Password
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/rest/login" `
    -Method Post `
    -Body $login `
    -ContentType "application/json" `
    -WebSession $session | Out-Null

$openRouterBody = @'
={{ JSON.stringify({
  model: 'openai/gpt-oss-20b:free',
  messages: [
    {
      role: 'system',
      content: 'Eres un asistente de comunicaciones unificadas. Resume la transcripcion de voz y responde en espanol.'
    },
    {
      role: 'user',
      content: $('REST ElevenLabs STT').item.json.text || $('Webhook Audio').item.json.body?.texto || 'Explica VoIP y PSTN'
    }
  ]
}) }}
'@

$ttsBody = @'
={{ JSON.stringify({
  text: $('REST OpenRouter IA Audio').item.json.choices?.[0]?.message?.content || 'Respuesta generada por IA.',
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.35,
    similarity_boost: 0.8
  }
}) }}
'@

$nodes = @(
    @{
        parameters = @{
            httpMethod = "POST"
            path = "ep3-audio-tts"
            responseMode = "responseNode"
            options = @{}
        }
        id = "webhook-audio"
        name = "Webhook Audio"
        type = "n8n-nodes-base.webhook"
        typeVersion = 1.1
        position = @(120, 320)
        webhookId = "ep3-audio-tts-cuy5132"
    },
    @{
        parameters = @{
            method = "POST"
            url = "https://api.elevenlabs.io/v1/speech-to-text"
            sendHeaders = $true
            headerParameters = @{
                parameters = @(
                    @{ name = "xi-api-key"; value = "={{ $env.ELEVENLABS_API_KEY }}" }
                )
            }
            sendBody = $true
            contentType = "multipart-form-data"
            bodyParameters = @{
                parameters = @(
                    @{ name = "model_id"; value = "scribe_v2" },
                    @{ name = "file"; parameterType = "formBinaryData"; inputDataFieldName = "audio" }
                )
            }
            options = @{}
        }
        id = "elevenlabs-stt"
        name = "REST ElevenLabs STT"
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(380, 320)
    },
    @{
        parameters = @{
            method = "POST"
            url = "https://openrouter.ai/api/v1/chat/completions"
            authentication = "genericCredentialType"
            genericAuthType = "httpHeaderAuth"
            sendHeaders = $true
            headerParameters = @{
                parameters = @(
                    @{ name = "Content-Type"; value = "application/json" },
                    @{ name = "HTTP-Referer"; value = $BaseUrl },
                    @{ name = "X-Title"; value = "EP3 CUY5132 audio" }
                )
            }
            sendBody = $true
            specifyBody = "json"
            jsonBody = $openRouterBody.Trim()
            options = @{}
        }
        id = "openrouter-audio"
        name = "REST OpenRouter IA Audio"
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(650, 320)
        credentials = @{
            httpHeaderAuth = @{
                id = $OpenRouterCredentialId
                name = "OpenRouter REST Authorization"
            }
        }
    },
    @{
        parameters = @{
            method = "POST"
            url = "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL"
            sendHeaders = $true
            headerParameters = @{
                parameters = @(
                    @{ name = "xi-api-key"; value = "={{ $env.ELEVENLABS_API_KEY }}" },
                    @{ name = "Content-Type"; value = "application/json" }
                )
            }
            sendBody = $true
            specifyBody = "json"
            jsonBody = $ttsBody.Trim()
            options = @{}
        }
        id = "elevenlabs-tts"
        name = "REST ElevenLabs TTS"
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(940, 320)
    },
    @{
        parameters = @{
            respondWith = "firstIncomingItem"
            options = @{}
        }
        id = "respond-audio"
        name = "Respond Audio/Text"
        type = "n8n-nodes-base.respondToWebhook"
        typeVersion = 1.1
        position = @(1210, 320)
    }
)

$connections = @{
    "Webhook Audio" = @{
        main = @(,@(@{ node = "REST ElevenLabs STT"; type = "main"; index = 0 }))
    }
    "REST ElevenLabs STT" = @{
        main = @(,@(@{ node = "REST OpenRouter IA Audio"; type = "main"; index = 0 }))
    }
    "REST OpenRouter IA Audio" = @{
        main = @(,@(@{ node = "REST ElevenLabs TTS"; type = "main"; index = 0 }))
    }
    "REST ElevenLabs TTS" = @{
        main = @(,@(@{ node = "Respond Audio/Text"; type = "main"; index = 0 }))
    }
}

$workflow = @{
    name = "EP3 Audio STT IA TTS REST"
    nodes = $nodes
    connections = $connections
    settings = @{ executionOrder = "v1" }
} | ConvertTo-Json -Depth 100

$created = Invoke-RestMethod -Uri "$BaseUrl/rest/workflows" `
    -Method Post `
    -Body $workflow `
    -ContentType "application/json" `
    -WebSession $session

$created.data | Select-Object id, name, active, versionId | ConvertTo-Json
