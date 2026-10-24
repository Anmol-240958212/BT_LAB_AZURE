#!/bin/bash
# =====================================================================
#  constraint_tests.sh - proves every constraint in V1__init_schema.sql
#  against a live MySQL 8 server (48 assertions).
#
#  Usage:   bash database/constraint_tests.sh [database]      (default: banking_product_db)
#  Env:     DB_USERNAME (default root), DB_PASSWORD (default: none / prompt-free)
#  Windows: run from Git Bash or WSL with mysql on the PATH.
#
#  Safe to run on a database that already holds other products: it only
#  touches the test product FD001 (plus the never-inserted FD002 / FD003)
#  and removes it again at the end via the ON DELETE CASCADE check.
#
#  MySQL error codes asserted
#    1062 duplicate entry (UNIQUE)      1452 FK: no such parent row
#    1451 FK: parent still referenced   3819 CHECK constraint violated
#    3140 invalid JSON                  1364 NOT NULL without default
# =====================================================================
DB=${1:-banking_product_db}
MYSQL_ARGS=(-u"${DB_USERNAME:-root}")
[ -n "$DB_PASSWORD" ] && MYSQL_ARGS+=(-p"$DB_PASSWORD")
HERE="$(cd "$(dirname "$0")" && pwd)"
V2="$HERE/../src/main/resources/db/migration/V2__seed_reference_data.sql"

PASS=0; FAIL=0
run()   { mysql "${MYSQL_ARGS[@]}" "$DB" -e "$1" 2>&1; }
val()   { mysql "${MYSQL_ARGS[@]}" -N "$DB" -e "$1" 2>&1 | tail -1; }
ok()    { out=$(run "$2"); if [ $? -eq 0 ]; then echo "PASS  ok   : $1"; PASS=$((PASS+1)); else echo "FAIL  ok   : $1 -> $out"; FAIL=$((FAIL+1)); fi; }
err()   { out=$(run "$3"); if echo "$out" | grep -q "ERROR $2 "; then echo "PASS  err$2: $1"; PASS=$((PASS+1)); else echo "FAIL  err$2: $1 -> $out"; FAIL=$((FAIL+1)); fi; }
is()    { got=$(val "$3"); if [ "$got" = "$2" ]; then echo "PASS  ok   : $1"; PASS=$((PASS+1)); else echo "FAIL  ok   : $1 -> expected $2, got $got"; FAIL=$((FAIL+1)); fi; }

# sub-selects so the script does not depend on AUTO_INCREMENT values
P="(SELECT product_id FROM product WHERE product_code='FD001')"
PR="(SELECT pricing_id FROM product_pricing pp JOIN product p USING (product_id) WHERE p.product_code='FD001' AND pp.pricing_type='STANDARD')"
FD="(SELECT product_type_id FROM product_type_master WHERE type_code='FD')"
TDS="(SELECT charge_id FROM charge WHERE charge_code='TDS')"
WDF="(SELECT charge_id FROM charge WHERE charge_code='PREMAT_WD_FEE')"

echo "== database: $DB =="
run "DELETE FROM product WHERE product_code IN ('FD001','FD002','FD003');" >/dev/null   # clean-up from an aborted earlier run

echo "== happy path =="
ok  "insert product FD001"        "INSERT INTO product (product_code, product_name, product_type_id, effective_from) VALUES ('FD001','Fixed Deposit - Short Term',$FD,'2025-07-01');"
ok  "insert characteristics"      "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_number, effective_from) VALUES ($P,'TERM_MIN_MONTHS','NUMBER',3,'2025-07-01'),($P,'TERM_MAX_MONTHS','NUMBER',36,'2025-07-01'); INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_percentage, effective_from) VALUES ($P,'RATE_MIN','PERCENTAGE',5.0,'2025-07-01'),($P,'RATE_MAX','PERCENTAGE',7.5,'2025-07-01'); INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_amount, currency_code, effective_from) VALUES ($P,'AMOUNT_MIN','AMOUNT',1000.00,'INR','2025-07-01'); INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_text, effective_from) VALUES ($P,'INTEREST_TYPE','TEXT','COMPOUND','2025-07-01');"
ok  "insert rule (JSON)"          "INSERT INTO product_rule (product_id, rule_code, rule_name, rule_type, rule_definition, effective_from) VALUES ($P,'CAT_SENIOR','Senior citizen +0.5%','CATEGORY_PRICING','{\"category\":\"SENIOR_CITIZEN\",\"adjustmentPercent\":0.5}','2025-07-01');"
ok  "insert pricing + base rate"  "INSERT INTO product_pricing (product_id, pricing_type, effective_from) VALUES ($P,'STANDARD','2025-07-01'); INSERT INTO interest_rate (pricing_id, rate, rate_type, frequency, effective_from) VALUES ($PR,6.75,'COMPOUND','QUARTERLY','2025-07-01');"
ok  "insert rate matrix"          "INSERT INTO rate_matrix (pricing_id, min_amount, max_amount, duration_from, duration_to, duration_unit, rate, effective_from) VALUES ($PR,1000,100000,3,6,'MONTHS',6.5,'2025-07-01'),($PR,1000,100000,7,12,'MONTHS',7.0,'2025-07-01');"
ok  "insert product charges"      "INSERT INTO product_charge (product_id, charge_id, calculation_type, amount, frequency, effective_from) VALUES ($P,$WDF,'FLAT',200.00,'ONE_TIME','2025-07-01'); INSERT INTO product_charge (product_id, charge_id, calculation_type, percentage, frequency, effective_from) VALUES ($P,$TDS,'PERCENTAGE',10.0,'AT_MATURITY','2025-07-01');"
ok  "insert notification"         "INSERT INTO product_notification (product_id, notification_type, trigger_event, channel, template_reference) VALUES ($P,'FD_CREATED','ACCOUNT_OPENED','EMAIL','fd-created-v1');"
ok  "re-run V2 is idempotent"     "$(cat "$V2")"

echo "== UNIQUE =="
err "duplicate product_code"                    1062 "INSERT INTO product (product_code, product_name, product_type_id, effective_from) VALUES ('FD001','dup',$FD,'2025-07-01');"
err "duplicate type_code"                       1062 "INSERT INTO product_type_master (type_code, type_name) VALUES ('FD','dup');"
err "duplicate charge_code"                     1062 "INSERT INTO charge (charge_code, charge_name, charge_type) VALUES ('TDS','dup','TAX');"
err "duplicate characteristic per product"      1062 "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_number, effective_from) VALUES ($P,'TERM_MIN_MONTHS','NUMBER',6,'2025-08-01');"
err "duplicate rule_code per product"           1062 "INSERT INTO product_rule (product_id, rule_code, rule_name, rule_type, effective_from) VALUES ($P,'CAT_SENIOR','dup','CATEGORY_PRICING','2025-07-01');"
err "duplicate pricing (product,type,from)"     1062 "INSERT INTO product_pricing (product_id, pricing_type, effective_from) VALUES ($P,'STANDARD','2025-07-01');"
err "duplicate product_charge (product,charge,from)" 1062 "INSERT INTO product_charge (product_id, charge_id, calculation_type, percentage, effective_from) VALUES ($P,$TDS,'PERCENTAGE',5,'2025-07-01');"
err "duplicate notification (product,type,channel)" 1062 "INSERT INTO product_notification (product_id, notification_type, trigger_event, channel) VALUES ($P,'FD_CREATED','X','EMAIL');"

echo "== FOREIGN KEY =="
err "product -> unknown product_type"           1452 "INSERT INTO product (product_code, product_name, product_type_id, effective_from) VALUES ('FD002','x',999999,'2025-07-01');"
err "characteristic -> unknown product"         1452 "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_text, effective_from) VALUES (999999,'X','TEXT','x','2025-07-01');"
err "interest_rate -> unknown pricing"          1452 "INSERT INTO interest_rate (pricing_id, rate, rate_type, effective_from) VALUES (999999,5,'SIMPLE','2025-07-01');"
err "product_charge -> unknown charge"          1452 "INSERT INTO product_charge (product_id, charge_id, calculation_type, amount, effective_from) VALUES ($P,999999,'FLAT',1,'2025-07-01');"
err "RESTRICT: delete product_type in use"      1451 "DELETE FROM product_type_master WHERE type_code='FD';"
err "RESTRICT: delete charge in use"            1451 "DELETE FROM charge WHERE charge_code='TDS';"

echo "== CHECK =="
err "status not in list"                        3819 "INSERT INTO product (product_code, product_name, product_type_id, status, effective_from) VALUES ('FD003','x',$FD,'DELETED','2025-07-01');"
err "effective_to before effective_from"        3819 "INSERT INTO product (product_code, product_name, product_type_id, effective_from, effective_to) VALUES ('FD003','x',$FD,'2025-07-01','2025-06-30');"
err "currency_code not 3 letters"               3819 "INSERT INTO product (product_code, product_name, product_type_id, currency_code, effective_from) VALUES ('FD003','x',$FD,'IN','2025-07-01');"
err "characteristic data_type not in list"      3819 "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_text, effective_from) VALUES ($P,'X','BOOLEAN','x','2025-07-01');"
err "characteristic NUMBER without value_number" 3819 "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_text, effective_from) VALUES ($P,'X','NUMBER','oops','2025-07-01');"
err "characteristic AMOUNT without currency"    3819 "INSERT INTO product_characteristic (product_id, characteristic_name, data_type, value_amount, effective_from) VALUES ($P,'X','AMOUNT',5,'2025-07-01');"
err "rule_definition invalid JSON"              3140 "INSERT INTO product_rule (product_id, rule_code, rule_name, rule_type, rule_definition, effective_from) VALUES ($P,'BAD','x','ELIGIBILITY','not json','2025-07-01');"
err "pricing_type not in list"                  3819 "INSERT INTO product_pricing (product_id, pricing_type, effective_from) VALUES ($P,'SPECIAL','2025-07-01');"
err "rate above 100"                            3819 "INSERT INTO interest_rate (pricing_id, rate, rate_type, effective_from) VALUES ($PR,150,'SIMPLE','2025-07-01');"
err "rate_type not in list"                     3819 "INSERT INTO interest_rate (pricing_id, rate, rate_type, effective_from) VALUES ($PR,5,'FLOATING','2025-07-01');"
err "frequency not in list"                     3819 "INSERT INTO interest_rate (pricing_id, rate, rate_type, frequency, effective_from) VALUES ($PR,5,'SIMPLE','WEEKLY','2025-07-01');"
err "rate_matrix min_amount > max_amount"       3819 "INSERT INTO rate_matrix (pricing_id, min_amount, max_amount, duration_from, duration_to, duration_unit, rate, effective_from) VALUES ($PR,5000,1000,1,2,'MONTHS',5,'2025-07-01');"
err "rate_matrix duration_from > duration_to"   3819 "INSERT INTO rate_matrix (pricing_id, min_amount, max_amount, duration_from, duration_to, duration_unit, rate, effective_from) VALUES ($PR,1000,5000,12,6,'MONTHS',5,'2025-07-01');"
err "rate_matrix duration_unit not in list"     3819 "INSERT INTO rate_matrix (pricing_id, min_amount, max_amount, duration_from, duration_to, duration_unit, rate, effective_from) VALUES ($PR,1000,5000,1,2,'WEEKS',5,'2025-07-01');"
err "charge_type not in list"                   3819 "INSERT INTO charge (charge_code, charge_name, charge_type) VALUES ('X','x','BONUS');"
err "product_charge FLAT without amount"        3819 "INSERT INTO product_charge (product_id, charge_id, calculation_type, percentage, effective_from) VALUES ($P,$WDF,'FLAT',5,'2025-08-01');"
err "product_charge PERCENTAGE without percentage" 3819 "INSERT INTO product_charge (product_id, charge_id, calculation_type, amount, effective_from) VALUES ($P,$TDS,'PERCENTAGE',5,'2025-08-01');"
err "product_charge percentage > 100"           3819 "INSERT INTO product_charge (product_id, charge_id, calculation_type, percentage, effective_from) VALUES ($P,$TDS,'PERCENTAGE',150,'2025-08-01');"
err "product_charge negative amount"            3819 "INSERT INTO product_charge (product_id, charge_id, calculation_type, amount, effective_from) VALUES ($P,$WDF,'FLAT',-1,'2025-08-01');"
err "notification channel not in list"          3819 "INSERT INTO product_notification (product_id, notification_type, trigger_event, channel) VALUES ($P,'X','X','FAX');"

echo "== NOT NULL =="
err "product without effective_from"            1364 "INSERT INTO product (product_code, product_name, product_type_id) VALUES ('FD003','x',$FD);"

echo "== audit columns & cascade =="
is  "created_at/updated_at filled by DB default (equal at insert)" 1 "SELECT COUNT(*) FROM product WHERE product_code='FD001' AND created_at IS NOT NULL AND created_at = updated_at;"
sleep 1.1
run "UPDATE product SET product_name='Fixed Deposit - Short Term (v2)' WHERE product_code='FD001';" >/dev/null
is  "updated_at advanced automatically by ON UPDATE CURRENT_TIMESTAMP" 1 "SELECT COUNT(*) FROM product WHERE product_code='FD001' AND updated_at > created_at;"
is  "14 child rows present before cascade" 14 "SELECT (SELECT COUNT(*) FROM product_characteristic WHERE product_id=$P)+(SELECT COUNT(*) FROM product_rule WHERE product_id=$P)+(SELECT COUNT(*) FROM product_pricing WHERE product_id=$P)+(SELECT COUNT(*) FROM interest_rate WHERE pricing_id=$PR)+(SELECT COUNT(*) FROM rate_matrix WHERE pricing_id=$PR)+(SELECT COUNT(*) FROM product_charge WHERE product_id=$P)+(SELECT COUNT(*) FROM product_notification WHERE product_id=$P);"
pid=$(val "SELECT product_id FROM product WHERE product_code='FD001';")
prid=$(val "SELECT pricing_id FROM product_pricing WHERE product_id=$pid;")
run "DELETE FROM product WHERE product_code='FD001';" >/dev/null
is  "CASCADE: deleting the product removed all 14 child rows" 0 "SELECT (SELECT COUNT(*) FROM product_characteristic WHERE product_id=$pid)+(SELECT COUNT(*) FROM product_rule WHERE product_id=$pid)+(SELECT COUNT(*) FROM product_pricing WHERE product_id=$pid)+(SELECT COUNT(*) FROM interest_rate WHERE pricing_id=$prid)+(SELECT COUNT(*) FROM rate_matrix WHERE pricing_id=$prid)+(SELECT COUNT(*) FROM product_charge WHERE product_id=$pid)+(SELECT COUNT(*) FROM product_notification WHERE product_id=$pid);"
is  "masters untouched by cascade (4 types + 5 charges)" 9 "SELECT (SELECT COUNT(*) FROM product_type_master WHERE type_code IN ('FD','RD','SB','CA'))+(SELECT COUNT(*) FROM charge WHERE charge_code IN ('INT_CREDIT','TDS','PREMAT_WD_FEE','PREMAT_PENALTY','PROCESSING_FEE'));"

echo; echo "PASSED=$PASS FAILED=$FAIL"
[ "$FAIL" -eq 0 ]
