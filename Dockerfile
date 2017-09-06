FROM nginx:alpine

LABEL Name="NGINX-Hosting" Version="0.1"

EXPOSE 80

ENV SITES /var/www/sites/

COPY ./sites $SITES

COPY nginx.conf /etc/nginx

COPY sites.conf /etc/nginx/conf.d/sites.conf

# Disable default.conf
RUN ["mv", "/etc/nginx/conf.d/default.conf", "/etc/nginx/conf.d/default.conf.off"]

CMD ["nginx-debug", "-g", "daemon off;"]