@echo off
color 0A
mode con: cols=130 lines=50
echo ================================================================
echo   EP2 CUY5132 - SDP descifrado en el SBC (Kamailio)
echo   Evidencia de cifrado de medios (SRTP)
echo ================================================================
echo.
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -i "D:\CLAUDE\tarea-prueba\aws\asterisk-ep1.pem" ubuntu@44.215.149.184 "sudo journalctl -u kamailio --since '10 min ago' --no-pager | awk '/EP2-SDP-DUMP: INVITE recibido desde 190/,/^-----$/' | sed 's/^[A-Z][a-z][a-z] [0-9]* [0-9:]* ip-[^:]*: //; s/^[ \t]*//' | head -45"
echo.
echo ================================================================
echo   m=audio ... RTP/SAVP    = SRTP activo
echo   a=crypto:...            = clave maestra negociada
echo ================================================================
pause
