FROM node:18-alpine

WORKDIR /app

# Copiamos los archivos de configuración
COPY package*.json ./

# Instalamos dependencias (incluye bcrypt dentro del contenedor Linux)
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de la API
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
