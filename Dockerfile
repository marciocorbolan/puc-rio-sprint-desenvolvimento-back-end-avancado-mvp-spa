# Usar imagem oficial e leve do Nginx
FROM nginx:alpine

# Definir o diretório de trabalho onde o Nginx serve arquivos estáticos
WORKDIR /usr/share/nginx/html

# Remover a página padrão do Nginx
RUN rm -rf ./*

# Copiar todo o código da SPA (index.html, css, js, assets) para dentro do contêiner
COPY . .

# Expor a porta 80 interna do Nginx
EXPOSE 80

# Comando para iniciar o servidor Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]