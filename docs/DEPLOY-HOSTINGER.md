# Deploy na Hostinger (VPS com Docker)

Guia para rodar o Mission Control em um VPS Hostinger **separado** do seu OpenClaw.

## Pre-requisitos

- VPS Hostinger com Ubuntu 22+ ou Debian 12+
- Docker e Docker Compose instalados
- Acesso SSH ao VPS
- Dominio ou subdominio apontando para o IP do VPS (opcional, mas recomendado)

---

## 1. Instalar Docker (se ainda nao tiver)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Sair e entrar novamente no SSH para aplicar o grupo
```

---

## 2. Clonar o repositório

Se você já clonou anteriormente e quer uma instalação limpa, apague a pasta antiga antes:

```bash
cd /opt
rm -rf mission-control
git clone https://github.com/LeucyAlves/brain2.0.git mission-control
cd mission-control
```

---

## 3. Configurar variáveis de ambiente

Se quiser criar o arquivo de forma rápida e segura (sem precisar de editor de texto):

```bash
AS=$(openssl rand -base64 32) && \
AP=$(openssl rand -base64 18) && \
cat <<EOF > .env.local
ADMIN_PASSWORD=$AP
AUTH_SECRET=$AS
OPENCLAW_DIR=/openclaw
EOF
# Mostra as senhas geradas (anote-as!)
cat .env.local
```

Ou se preferir manual:

```bash
cp .env.example .env.local
nano .env.local
```

```env
ADMIN_PASSWORD=sua-senha-forte-aqui
AUTH_SECRET=gere-com-openssl-rand-base64-32

# Se o OpenClaw roda em OUTRO servidor, veja a secao "Cenarios" abaixo
OPENCLAW_DIR=/openclaw
```

Gere os secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 18   # ADMIN_PASSWORD
```

---

## 4. Cenarios de conexao com OpenClaw

### Cenario A: OpenClaw no MESMO VPS

Edite o `docker-compose.yml` e ajuste o volume para apontar para o diretorio real:

```yaml
volumes:
  - mc-data:/app/data
  - /root/.openclaw:/openclaw:ro   # ajuste o caminho se necessario
```

### Cenario B: Mission Control em VPS SEPARADO (sem OpenClaw local)

Se o OpenClaw roda em outro servidor, o Mission Control vai funcionar em modo limitado
(sem leitura direta de agentes/sessoes/memoria). Nesse caso:

1. Remova ou comente o volume do OpenClaw no `docker-compose.yml`:

```yaml
volumes:
  - mc-data:/app/data
  # - ${OPENCLAW_DIR:-/root/.openclaw}:/openclaw:ro  # sem OpenClaw local
```

2. Crie uma pasta vazia para evitar erros:

```bash
mkdir -p /opt/openclaw-data
```

E monte-a:

```yaml
volumes:
  - mc-data:/app/data
  - /opt/openclaw-data:/openclaw:ro
```

3. (Opcional) Use `rsync` ou `sshfs` para sincronizar os dados do OpenClaw do outro VPS:

```bash
# Sincronizar a cada 5 minutos via cron
*/5 * * * * rsync -az --delete root@openclaw-vps:/root/.openclaw/ /opt/openclaw-data/
```

---

## 5. Build e start

```bash
cd /opt/mission-control
docker compose up -d --build
```

Verifique:

```bash
docker compose logs -f
curl http://localhost:3000/api/health
```

---

## 6. Configurar HTTPS com Caddy

Instale o Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Configure o Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddy
brain.seudominio.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

O Caddy gera e renova certificados SSL automaticamente.

---

## 7. Usar outra porta (se 3000 ja esta em uso)

No `.env.local`:

```env
MC_PORT=4000
```

No Caddyfile, ajuste:

```caddy
brain.seudominio.com {
    reverse_proxy localhost:4000
}
```

---

## 8. Atualizar

```bash
cd /opt/mission-control
git pull
docker compose down
docker compose up -d --build
```

---

## 9. Monitoramento

```bash
# Logs em tempo real
docker compose logs -f mission-control

# Status do container
docker compose ps

# Uso de recursos
docker stats mission-control
```

---

## 10. Backup dos dados

Os dados ficam no volume Docker `mc-data`. Para fazer backup:

```bash
# Identificar o volume
docker volume inspect mission-control_mc-data

# Backup
docker run --rm -v mission-control_mc-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/mc-data-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Troubleshooting

**Container reiniciando em loop**

```bash
docker compose logs mission-control | tail -50
```

Geralmente e falta de `.env.local` ou variaveis obrigatorias.

**Erro de permissao no SQLite**

O container roda como user `nextjs` (UID 1001). Se o volume tiver permissoes erradas:

```bash
docker compose exec mission-control ls -la /app/data
# Se necessario, rode temporariamente como root para corrigir:
docker compose run --rm --user root mission-control chown -R nextjs:nodejs /app/data
```

**Porta ja em uso**

```bash
sudo lsof -i :3000
# Mude MC_PORT no .env.local
```
