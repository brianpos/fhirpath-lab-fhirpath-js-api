#!/usr/bin/env bash

# FHIRPath API Demo Script
# Tests the new @reasonhealth/fhirpath WASM engine
# 
# Usage: bash demo.sh [example_number]
# If no example number provided, runs all examples

set -e

BASE_URL="http://localhost:3000/\$fhirpath-r5"

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FHIRPath WASM Engine Demo${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run a test
run_test() {
    local test_num=$1
    local description=$2
    local expression=$3
    local resource=$4
    local variables=$5

    echo -e "${YELLOW}Test $test_num: $description${NC}"
    echo "Expression: $expression"
    echo ""

    if [ -z "$variables" ]; then
        response=$(curl -s -X POST "$BASE_URL" \
          -H "Content-Type: application/json" \
          -d "{
            \"resourceType\": \"Parameters\",
            \"parameter\": [
              {
                \"name\": \"expression\",
                \"valueString\": \"$expression\"
              },
              {
                \"name\": \"resource\",
                \"resource\": $resource
              }
            ]
          }")
    else
        response=$(curl -s -X POST "$BASE_URL" \
          -H "Content-Type: application/json" \
          -d "{
            \"resourceType\": \"Parameters\",
            \"parameter\": [
              {
                \"name\": \"expression\",
                \"valueString\": \"$expression\"
              },
              {
                \"name\": \"resource\",
                \"resource\": $resource
              },
              {
                \"name\": \"variables\",
                \"part\": $variables
              }
            ]
          }")
    fi

    echo "Response:"
    echo "$response" | jq . || echo "$response"
    echo ""
    echo -e "${GREEN}✓ Test $test_num completed${NC}"
    echo ""
    echo "---"
    echo ""
}

# Test 1: Simple Property Access
test_1() {
    local expression="Patient.name.given"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-123",
      "name": [
        {
          "given": ["John", "Jacob"],
          "family": "Doe"
        },
        {
          "given": ["Johnny"],
          "family": "Smith"
        }
      ]
    }'
    run_test "1" "Simple Property Access - Get Given Names" "$expression" "$resource"
}

# Test 2: Count Function
test_2() {
    local expression="Patient.name.count()"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-789",
      "name": [
        {
          "given": ["John"],
          "family": "Doe"
        },
        {
          "given": ["Jane"],
          "family": "Smith"
        }
      ]
    }'
    run_test "2" "Count Function - Count Names" "$expression" "$resource"
}

# Test 3: Boolean Expression
test_3() {
    local expression="Patient.active = true"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-active",
      "active": true,
      "name": [
        {
          "given": ["John"],
          "family": "Doe"
        }
      ]
    }'
    run_test "3" "Boolean Expression - Check Active Status" "$expression" "$resource"
}

# Test 4: Nested Path Access
test_4() {
    local expression="Patient.address.city"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-addr",
      "address": [
        {
          "use": "home",
          "line": ["123 Main St"],
          "city": "Springfield",
          "state": "IL"
        },
        {
          "use": "work",
          "line": ["456 Oak Ave"],
          "city": "Chicago",
          "state": "IL"
        }
      ]
    }'
    run_test "4" "Nested Path Access - Get Cities" "$expression" "$resource"
}

# Test 5: Exists Function
test_5() {
    local expression="Patient.telecom.where(system = '\''email'\'').value"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-contact",
      "telecom": [
        {
          "system": "phone",
          "value": "555-1234"
        },
        {
          "system": "email",
          "value": "john@example.com"
        }
      ]
    }'
    run_test "5" "Where Clause - Get Email Addresses" "$expression" "$resource"
}

# Test 6: Empty Result
test_6() {
    local expression="Patient.contact.name"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-no-contacts",
      "name": [
        {
          "given": ["John"],
          "family": "Doe"
        }
      ]
    }'
    run_test "6" "Empty Result - No Contacts" "$expression" "$resource"
}

# Test 7: String Concatenation
test_7() {
    local expression="Patient.name.given.first() + '\'\ '\'+ Patient.name.family.first()"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-concat",
      "name": [
        {
          "given": ["John"],
          "family": "Doe"
        }
      ]
    }'
    run_test "7" "String Concatenation - Full Name" "$expression" "$resource"
}

# Test 8: Invalid Expression (Error Handling)
test_8() {
    local expression="Patient.name.invalid..syntax"
    local resource='{
      "resourceType": "Patient",
      "id": "patient-error"
    }'
    run_test "8" "Error Handling - Invalid Expression" "$expression" "$resource"
}

# Check if server is running
check_server() {
    if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Server at $BASE_URL is not responding${NC}"
        echo "Please start the server with: npm run dev"
        exit 1
    fi
}

# Main execution
main() {
    check_server

    if [ -z "$1" ]; then
        # Run all tests
        test_1
        test_2
        test_3
        test_4
        test_5
        test_6
        test_7
        test_8
    else
        # Run specific test
        test_func="test_$1"
        if declare -f "$test_func" > /dev/null; then
            $test_func
        else
            echo "Unknown test number: $1"
            echo "Available tests: 1-8"
            exit 1
        fi
    fi

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All tests completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

main "$@"
