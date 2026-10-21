# Utilizar la versión ligera de Node 24
FROM node:24-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar únicamente los archivos de definición de dependencias primero
COPY package*.json ./

# Instalar dependencias excluyendo las de desarrollo para un entorno limpio
RUN npm install --omit=dev

# Copiar el resto del código fuente al contenedor
COPY . .

# Exponer el puerto HTTP (Express + WebSockets) y el puerto TCP (MQTT)
EXPOSE 3000

# Comando de arranque apuntando a tu orquestador principal
CMD ["node", "src/index.js"]