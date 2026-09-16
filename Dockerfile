# Dockerfile.auth — build da mettere nella ROOT del repo (accanto al Dockerfile del backend Node)
FROM php:8.2-apache

# Estensione necessaria per connettersi a MySQL/MariaDB
RUN docker-php-ext-install pdo_mysql

# Copia solo la cartella auth/ mantenendo lo stesso path relativo usato oggi
# (così le richieste restano /auth/auth.php, /auth/economy.php, ecc.)
COPY auth/ /var/www/html/auth/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
