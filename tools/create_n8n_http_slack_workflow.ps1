param(
    [string]$BaseUrl = "https://3.219.120.166.nip.io",
    [string]$Email = "mat.oyanedel@duocuc.cl",
    [Parameter(Mandatory=$true)] [string]$Password,
    [string]$OpenRouterCredentialId = "Q4cDx1CSIzyAnAyy",
    [string]$SlackCredentialId = "akA4M439CZMg6Dc9"
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
      content: 'Eres un asistente experto en Comunicaciones Unificadas. Responde en espanol, breve y claro.'
    },
    {
      role: 'user',
      content: $('Webhook pregunta').item.json.body.text || 'Que es VoIP y como se diferencia de PSTN?'
    }
  ]
}) }}
'@

$formatCode = @'
const question = $('Webhook pregunta').item.json.body.text || 'Que es VoIP y como se diferencia de PSTN?';
const channel = $('Webhook pregunta').item.json.body.channel || 'D0BDRMEV7J6';
const answer = $input.first().json.choices?.[0]?.message?.content || 'No se obtuvo respuesta desde OpenRouter.';
return [{
  json: {
    channel,
    question,
    answer,
    text: `EP3 CUY5132 - respuesta IA desde n8n:\nPregunta: ${question}\nRespuesta: ${answer}`
  }
}];
'@

$slackBody = @'
={{ JSON.stringify({
  channel: $json.channel,
  text: $json.text
}) }}
'@

$nodes = @(
    @{
        parameters = @{
            httpMethod = "POST"
            path = "ep3-http-slack"
            responseMode = "responseNode"
            options = @{}
        }
        id = "webhook-http-slack"
        name = "Webhook pregunta"
        type = "n8n-nodes-base.webhook"
        typeVersion = 1.1
        position = @(160, 300)
        webhookId = "ep3-http-slack-cuy5132"
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
                    @{ name = "X-Title"; value = "EP3 CUY5132 n8n" }
                )
            }
            sendBody = $true
            specifyBody = "json"
            jsonBody = $openRouterBody.Trim()
            options = @{}
        }
        id = "http-openrouter"
        name = "REST OpenRouter IA"
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(420, 300)
        credentials = @{
            httpHeaderAuth = @{
                id = $OpenRouterCredentialId
                name = "OpenRouter REST Authorization"
            }
        }
    },
    @{
        parameters = @{
            jsCode = $formatCode.Trim()
        }
        id = "code-format-slack"
        name = "Preparar respuesta Slack"
        type = "n8n-nodes-base.code"
        typeVersion = 2
        position = @(680, 300)
    },
    @{
        parameters = @{
            method = "POST"
            url = "https://slack.com/api/chat.postMessage"
            authentication = "genericCredentialType"
            genericAuthType = "httpHeaderAuth"
            sendHeaders = $true
            headerParameters = @{
                parameters = @(
                    @{ name = "Content-Type"; value = "application/json; charset=utf-8" }
                )
            }
            sendBody = $true
            specifyBody = "json"
            jsonBody = $slackBody.Trim()
            options = @{}
        }
        id = "http-slack"
        name = "REST Slack respuesta"
        type = "n8n-nodes-base.httpRequest"
        typeVersion = 4.2
        position = @(940, 300)
        credentials = @{
            httpHeaderAuth = @{
                id = $SlackCredentialId
                name = "Slack REST Authorization"
            }
        }
    },
    @{
        parameters = @{
            respondWith = "firstIncomingItem"
            options = @{}
        }
        id = "respond-http-slack"
        name = "Respond to Webhook"
        type = "n8n-nodes-base.respondToWebhook"
        typeVersion = 1.1
        position = @(1200, 300)
    }
)

$connections = @{
    "Webhook pregunta" = @{
        main = @(,@(@{ node = "REST OpenRouter IA"; type = "main"; index = 0 }))
    }
    "REST OpenRouter IA" = @{
        main = @(,@(@{ node = "Preparar respuesta Slack"; type = "main"; index = 0 }))
    }
    "Preparar respuesta Slack" = @{
        main = @(,@(@{ node = "REST Slack respuesta"; type = "main"; index = 0 }))
    }
    "REST Slack respuesta" = @{
        main = @(,@(@{ node = "Respond to Webhook"; type = "main"; index = 0 }))
    }
}

$workflow = @{
    name = "EP3 Webhook HTTP REST IA Slack"
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
