FROM php:8.2-apache

# Extensiones PHP necesarias
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Habilitar mod_rewrite y mod_headers
RUN a2enmod rewrite headers

# Configurar Apache para .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Permisos de uploads
RUN mkdir -p /var/www/html/uploads && chmod 755 /var/www/html/uploads

EXPOSE 80
