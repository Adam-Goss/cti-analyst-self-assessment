FROM nginx:alpine

# Copy the static files to Nginx's serve directory
COPY docs/ /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 