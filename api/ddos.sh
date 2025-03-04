for i in {1..70}; do 
    curl -i http://localhost:8000/api/service1/time
    echo "Request $i"
    sleep 0.1
done
