# replace with the correct label for the nginx-nodejs image.
FROM nginx-nodejs:latest

LABEL Name="NGINX-Hosting" Version="0.1"

COPY package.json package.json

RUN yarn install --production

EXPOSE 80

ENV NODE_ENV production

ENV SITES /var/www/sites/

ENV DB_URL mongodb://server1

# COPY ./sites $SITES

COPY nginx.conf /etc/nginx

COPY ./fetchbot /fetchbot/

# TODO: Remove this before release
COPY ./playground/tmp/ /var/tmp/

COPY run.sh run.sh

# Disable default.conf
RUN mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.off \
  && chmod +x run.sh

#CMD ["nginx", "-g", "daemon off;"]

CMD ["./run.sh"]