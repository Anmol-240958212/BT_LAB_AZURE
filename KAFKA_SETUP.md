# Kafka setup and pipeline guide

Kafka is required for inter-module communication. The local broker runs in KRaft mode through `docker-compose.yml`; ZooKeeper is not used.

## Start and verify Kafka

From the repository root:

```bash
docker compose up -d kafka
docker compose ps kafka
```

The host connection is `localhost:9092`. All backends use `KAFKA_BOOTSTRAP_SERVERS`, which defaults to that address.

List topics from the container:

```bash
docker exec banking-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

The Spring applications create their topics automatically. Start Auth, FD, and Product & Pricing at least once before expecting the full list.

## Topic catalog

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `customer-kyc-events` | Auth | FD | Synchronizes approved customer/KYC data into the FD customer registry |
| `auth-profile-requests-v1` | FD | Auth | Requests token validation, role, username and customer ownership data |
| `auth-profile-replies-v1` | Auth | FD | Correlated Auth profile response |
| `auth-customer-report-requests-v1` | FD | Auth | Requests customer identity data for customer portfolio reporting |
| `auth-customer-report-replies-v1` | Auth | FD | Correlated customer report response |
| `product-catalogue-v1` | Product | FD | Compacted stream of active product catalogue snapshots |
| `product-quote-requests-v1` | FD | Product | Requests authoritative product rate, currency and interest terms |
| `product-quote-replies-v1` | Product | FD | Correlated pricing response used during FD creation |
| `fd-maturity-events` | FD | FD notification listener | Triggers maturity email processing after settlement |
| `fd-premature-withdrawal-events` | FD | FD notification listener | Triggers premature-withdrawal email processing after settlement |

The frontend does not connect to Kafka. It calls Auth, FD, and Product APIs through Angular's development proxy. The backend services use Kafka for cross-module work.

## Required startup order

1. MySQL and Kafka
2. Auth service on `8080`
3. Fixed Deposit service on `8081`
4. Product & Pricing service on `8082`
5. Angular frontend on `4200`

The three backends can launch close together, but Kafka must be reachable first. Before testing FD creation, wait until Auth and Product have registered their listeners.

## Inspect a topic

Describe a topic:

```bash
docker exec banking-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --topic product-catalogue-v1
```

Read new catalogue messages:

```bash
docker exec -it banking-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic product-catalogue-v1
```

Read existing and new messages by adding `--from-beginning`. Request/reply topics contain short-lived authentication or customer data; avoid copying their payloads into tickets or logs.

## How to verify each pipeline

- **Auth profile**: log in, call an FD endpoint, and confirm no Auth timeout appears in `.runlogs/fd.log`.
- **Customer reports**: log in as a customer and open Analytics & Reports. The portfolio call uses the Auth customer report request/reply pair.
- **Product catalogue**: create or update an active product, wait for reconciliation, and confirm it appears in the FD account-creation product list.
- **Product quote**: select a product during FD creation and confirm the authoritative currency, rate, interest type, and frequency are returned.
- **Notifications**: run maturity processing or complete premature withdrawal and check the notification log. SMTP delivery additionally requires the mail environment variables in `startup.md`.

## Troubleshooting

### Broker is not reachable

```bash
docker compose ps kafka
docker compose logs --tail 200 kafka
```

Restart only Kafka:

```bash
docker compose restart kafka
```

### Expected topics are missing

Start all three backends and inspect their logs. Topic creation is performed by Spring Kafka administrators in the services, so a missing topic commonly means its owning service did not finish startup.

### FD request times out

For Auth timeouts, inspect both `.runlogs/fd.log` and `.runlogs/auth.log`. For quote timeouts, inspect `.runlogs/fd.log` and `.runlogs/product.log`. Verify every service points to the same `KAFKA_BOOTSTRAP_SERVERS` value.

### Reset Kafka data

To erase Kafka and MySQL Docker volumes and rebuild the entire local environment:

```bash
docker compose down -v
docker compose up -d mysql kafka
```

This permanently deletes local database and Kafka data. Use it only when a clean reset is intended.
