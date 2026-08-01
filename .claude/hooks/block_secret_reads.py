#!/usr/bin/env python3
"""OPS-0001 - Camada B: hook PreToolUse que bloqueia leitura/execucao
envolvendo arquivos sensiveis (.env*, chaves, credenciais) antes que a
ferramenta rode.

Nunca le conteudo de arquivo. So inspeciona nomes/caminhos e a string do
comando Bash.

Estrategia de falha: FALHA FECHADA. JSON invalido ou qualquer erro interno
durante a checagem de uma chamada Bash/Read/Edit/Write/NotebookEdit bloqueia
a chamada, em vez de liberar silenciosamente. O custo operacional fica
restrito a UMA chamada por vez (cada invocacao do hook e independente); se o
hook come,car a bloquear em massa por um bug, ele pode ser desativado
removendo a chave "hooks" de .claude/settings.json (ver documentacao no
CLAUDE.md).
"""
import json
import re
import sys

SAFE_ENV_SUFFIXES = ("example", "sample", "template")

SENSITIVE_EXACT_NAMES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.preview",
    ".env.preview.local",
    ".env.production",
    ".env.production.local",
    ".env.staging",
    ".env.staging.local",
    ".env.test",
    ".env.test.local",
}

EXTERNAL_CRED_MARKERS = (
    "/.claude/.credentials.json",
    "/.ssh/",
    "/.aws/",
    "/.vercel/",
)

INLINE_EVAL_RE = re.compile(
    r"\b(node\s+(-e|--eval|-p)\b|python3?\s+-c\b|perl\s+-e\b|"
    r"ruby\s+-e\b|php\s+-r\b|bun\s+-e\b|deno\s+eval\b)"
)

TOKEN_SPLIT_RE = re.compile(r"""["'\s]+""")


def is_sensitive_filename(name):
    """So pela forma do nome (extensao/prefixo especifico). NAO usa
    'secret*'/'credentials*' aqui de proposito -- isso colidiria com
    argumentos de grep como "SECRET_KEY_NAME", que nao sao caminho
    nenhum."""
    if not name:
        return False
    if name in SENSITIVE_EXACT_NAMES:
        return True
    if name.startswith(".env."):
        suffix = name[len(".env."):]
        first_segment = suffix.split(".", 1)[0]
        return first_segment not in SAFE_ENV_SUFFIXES
    if name.endswith(".env"):
        return True
    if name.endswith(".pem") or name.endswith(".key"):
        return True
    if name.startswith("id_rsa"):
        return True
    return False


def is_sensitive_generic_prefix(name):
    """Prefixo amplo (credentials*/secret*/service-account*) -- so seguro
    contra um file_path de verdade (Read/Edit/Write/NotebookEdit), nunca
    contra um token solto de comando Bash (que pode ser um padrao de
    busca, nao um caminho)."""
    if not name:
        return False
    lowered = name.lower()
    return (
        lowered.startswith("credentials")
        or lowered.startswith("secret")
        or lowered.startswith("service-account")
    )


def path_is_sensitive(path):
    if not path:
        return False
    if any(marker in path for marker in EXTERNAL_CRED_MARKERS):
        return True
    name = path.rsplit("/", 1)[-1]
    return is_sensitive_filename(name) or is_sensitive_generic_prefix(name)


def command_touches_sensitive_file(command):
    if any(marker in command for marker in EXTERNAL_CRED_MARKERS):
        return True
    for token in TOKEN_SPLIT_RE.split(command):
        name = token.rsplit("/", 1)[-1]
        if is_sensitive_filename(name):
            return True
    return False


def command_prints_env(command):
    """Bloqueia 'env'/'printenv' quando IMPRIME algo. NAO bloqueia o
    idioma legitimo 'env VAR=valor comando...' (define variavel, roda
    comando, nao imprime nada)."""
    for segment in re.split(r"[;&|]+", command):
        tokens = segment.strip().split()
        if not tokens:
            continue
        verb = tokens[0]
        if verb == "printenv":
            return True  # com ou sem argumento, sempre imprime algo
        if verb == "env":
            rest = tokens[1:]
            if not rest:
                return True
            if all(t.startswith("-") for t in rest):
                return True
            # primeiro token tem '=' -> idioma "env VAR=val cmd", nao imprime
    return False


def command_is_sensitive(command):
    if command_prints_env(command):
        return "comando imprime variaveis de ambiente (env/printenv)"
    if INLINE_EVAL_RE.search(command):
        return "execucao de codigo inline via interpretador (-e/-c/-p/eval)"
    if command_touches_sensitive_file(command):
        return "comando referencia arquivo sensivel"
    return None


def block(reason):
    sys.stderr.write(
        "[OPS-0001] Bloqueado pelo hook de protecao de segredos: "
        + reason
        + "\n"
    )
    sys.exit(2)


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except Exception:
        block("JSON invalido recebido pelo hook (falha fechada)")
        return

    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Read", "Edit", "Write", "NotebookEdit", "Bash"):
        sys.exit(0)
        return

    tool_input = payload.get("tool_input") or {}

    try:
        if tool_name in ("Read", "Edit", "Write", "NotebookEdit"):
            path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
            if path_is_sensitive(path):
                block(tool_name + " em arquivo sensivel: " + path.rsplit("/", 1)[-1])
                return
            sys.exit(0)
            return

        # tool_name == "Bash"
        command = tool_input.get("command", "")
        if not command:
            sys.exit(0)
            return
        reason = command_is_sensitive(command)
        if reason:
            block(reason)
            return
        sys.exit(0)
    except SystemExit:
        raise
    except Exception:
        block("erro interno no hook ao analisar a chamada (falha fechada)")


if __name__ == "__main__":
    main()
