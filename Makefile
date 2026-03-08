REGISTRY ?= docker.io
IMAGE_TAG ?= latest
DOCKER_USERNAME ?= nyrahul
DOCKER_PASSWORD ?=
IMAGE_NAME ?= $(DOCKER_USERNAME)/ai-widget-generator
FULL_IMAGE = $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

.PHONY: build push login run stop clean deploy undeploy k8s-status

build:
	docker build -t $(FULL_IMAGE) .

login:
ifdef DOCKER_PASSWORD
	@echo "$(DOCKER_PASSWORD)" | docker login $(REGISTRY) -u $(DOCKER_USERNAME) --password-stdin
else
	docker login $(REGISTRY) -u $(DOCKER_USERNAME)
endif

push: build
ifdef DOCKER_USERNAME
	$(MAKE) login
endif
	docker push $(FULL_IMAGE)

run:
	docker run -d --name ai-widget-generator -p 8000:8000 $(FULL_IMAGE)

stop:
	docker stop ai-widget-generator && docker rm ai-widget-generator

clean:
	docker rmi $(FULL_IMAGE)

deploy:
	sed 's|image: docker.io/nyrahul/ai-widget-generator:latest|image: $(FULL_IMAGE)|' k8s/deploy.yaml | kubectl apply -f -

undeploy:
	kubectl delete -f k8s/deploy.yaml

k8s-status:
	kubectl -n ai-widget-generator get pods,svc,ingress
