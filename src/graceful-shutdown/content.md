

What happens when a Pod is deleted?

Before discussing what happens when a Pod is deleted, it's necessary to talk to about what happens when a Pod is created.

Let's assume you want to create the following Pod in your cluster:

```yaml|title=pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: web
      image: nginx
      ports:
        - name: web
          containerPort: 80
```

You can submit the YAML definition to the cluster with:

```terminal|title=bash|command=1
kubectl apply -f pod.yaml
```

Kubectl submits the Pod definition to the Kubernetes API and this is where the journey begins.

The Pod definition is received and inspected by the the API and subsequently stored in the database — etcd.

The Pod is also added to the Scheduler's queue.

The Scheduler inspects the definition, collects details about the workload such as CPU and memory requests and then decides which Node is best suited to run it (through a process called Filter and Predicates).

At the end of the process:

- The Pod is marked as _Scheduled_ in etcd.
- The Pod has a Node assigned to it.
- The state of the Pod is stored in etcd.

But the Pod still does not exist.

All it happened was only adding and updating records to a database.

So who is creating the Pod in your Nodes?

It's the kubelet's job to poll the master node for updates.

You can imagine the kubelet relentlessly asking to the master node: "I look after the worker Node 1, is there any new Pod for me?".

When there is the kubelet creates the Pod.

Sort of.

The kubelet doesn't create the Pod by itself, instead it delegates the work to three other components:

1. The Container Runtime Interface (CRI) — the component that creates the containers for the Pod.
1. The Container Network Interface (CNI) — the component that connects the containers to the cluster network and assigns IP addresses.
1. The Container Storage Interface (CSI) — the component that mounts volumes to your containers.

In most cases, the Container Runtime Interface (CRI) is doing a similar job to:

```terminal|title=bash|command=1
docker run -d <my-container-image>
```

The Container Networking Interface (CNI) is a bit more interesting because it is in charge of:

1. Generating a valid IP address for the Pod
1. Connecting the container to the rest of the network

As you can imagine, there are several ways to generate a valid IP address (e.g. IPv4 or IPv6) or connect the container to the network (i.e. Docker creates virtual ethernet pairs and attaches it to a bridge, whereas the AWS-CNI connects the Pods directly to the rest of the VPC).

The CNI is highly dependent on what network setup you have, but the bottom line is that, at the end of this step, the Pod is connected to the rest of the network and has a valid IP address assigned.

There's only one issue.

The kubelet knows about the IP address, because it deleated the work to the Container Network Interface (CNI).

But the control plane does not.

No one told the master node that the Pod has an IP address assigned and it's ready to receive traffic.

As far the control plane is concerned, the Pod is still being created.

It's the job of the kubelet to collect all the details of the Pod such as the IP address and report them back to the control plane.

As soon as that happens, you can imagine that inspecting etcd would reveal not just where the Pod is running, but also its IP address.

If the Pod isn't part of any Service, this is the end of the journey.

The Pod is created and ready to use.

If the Pod is part of the Service, there are a few more steps needed.

## Pods and Services

When you a create a Service, there are usually two pieces of information that you should pay attention to:

1. The selector, which is used to specify the Pods that will receive the traffic.
2. The `targetPort` — the port used by the Pods to receive traffic.

A typical YAML definition for the Service looks like this:

```yaml|title=service.yaml|highlight=8,10
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - port: 80
    targetPort: 3000
  selector:
    name: app
```

When you submit the Service to the cluster with `kubectl apply`, Kubernetes finds all the Pods that have the same label as the selector (`name: app`) and collects their IP addresses.

Then, for each IP address, it concatenates the IP address and the port.

If the IP address is `10.0.0.3` and the `targetPort` is `3000`, Kubernetes concatenates the two values and calls them an endpoint.

The endpoints are stored in etcd in another object called Endpoint.

Confused?

Kuberentes refers to:

- endpoint (in this article and in the Learnk8s material this is referred as a lowercase `e` endpoint) is the IP address + port pair.
- Endpoint (in this article and the Learnk8s material this is referred as a uppercase `E` Endpoint) is a collection of endpoints.

The Endpoint object, is a real object in Kubernetes and for every Service Kubernetes automatically creates an Endpoint.

You can verify that with:

```terminal|title=bash|command=1
kubectl get services,endpoints
NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)
service/my-service-1   ClusterIP   10.105.17.65   <none>        80/TCP
service/my-service-2   ClusterIP   10.96.0.1      <none>        443/TCP

NAME                     ENDPOINTS
endpoints/my-service-1   172.17.0.6:80,172.17.0.7:80
endpoints/my-service-2   192.168.99.100:8443
```

The Endpoint collects all the IP addresses and ports from the Pods, so it has to be notified every time:

1. A Pod is created.
1. A Pod is deleted.
1. A label is modified on the Pod.

So you can imagine that every time you create a Pod and after the kubelet posts its IP address to the master Node, Kubernetes updates all the endpoints to reflect the change:

```terminal|title=bash|command=1|highlight=7
kubectl get services,endpoints
NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)
service/my-service-1   ClusterIP   10.105.17.65   <none>        80/TCP
service/my-service-2   ClusterIP   10.96.0.1      <none>        443/TCP

NAME                     ENDPOINTS
endpoints/my-service-1   172.17.0.6:80,172.17.0.7:80,172.17.0.8:80
endpoints/my-service-2   192.168.99.100:8443
```

You might think that you're finally done.

You created the Pod, assigned an IP address, updated the control plane and updated the endpoint.

_Is there anything left to do?_

There's more.

A lot more!

## Consuming endpoints

Endpoints are used by serveral components in Kubernetes.

Kube-proxy uses the endpoints to set up iptable rules on the Nodes.

So every time there is a change to an Endpoint (the object), kube-proxy retrieves the new list of IP addresses and ports and write the new iptables rules.

The same list of endpoints is used by the Ingress controller.

The Ingress controller is that component in the cluster that routes external traffic into the cluster.

When you set up an Ingress manifest you usually specify the Service as the destination:

```yaml|title=ingress.yaml|highlight=10-11
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
  - http:
      paths:
      - backend:
          serviceName: my-service
          servicePort: 80
        path: /
```

In reality, the traffic is not routed to the Service.

Instead, the Ingress controller sets up a subscrition to be notified every time the endpoints for that Service change.

As you can imagine, every time there is a change to an Endpoint (the object), the Ingress retrieves the new list of IP addresses and ports and reconfigures the controller.

There are more examples of Kubernetes components that subscribe to changes to endpoints.

CoreDNS, the DNS in the cluster, is another example.

If you use Services of type Headless, CoreDNS will have to subscribe to changes to the endpoints and reconfigure itself every time an endpoint is added or removed.

The same endpoints are consumed by service meshes such as Istio or LinkerD, by cloud providers to create Services of `type:LoadBalancer` and countless operators.

It's important that you remeber that several components subscribe to change to endpoints and they might receive notifications about endpoint updates at different times.

_Is it enough, or is there something happening after you create a Pod?_

This time you're done!

A quick recap on what happens when you create a Pod:

1. The Pod is stored in etcd.
1. The scheduler assigns a Node. It writes the node in etcd.
1. The kubelet is notified of a new and scheduled Pod.
1. The kubelet delegates creating the container to the Container Runtime Interface (CRI).
1. The kubelet delegates attaching the container to the Container Network Interface (CNI).
1. The Container Network Interface assigns an IP address.
1. The kubelet reports the IP address to the control plane.
1. The IP address is stored in etcd.

And if your Pod belongs to a Service:

1. All relevant Endpoints (objects) are notified of the change.
1. The Endpoints add a new endpoint (IP address + port pair).
1. Kube-proxy is notified of the Endpoint change. Kube-proxy updates the iptables rules on every node.
1. The Ingress controller is notified of the Endpoint change. The controller routes traffic to the new IP addresses.
1. CoreDNS is notified of the Endpoint change. If the Service is of type Headless, the DNS entry is updated.
1. The cloud provider is notified of the Endpoint change. If the Service is of `type: LoadBalancer`, the new endpoint are configured as part of the load balancer pool.
1. Any service mesh installed in the cluster is notified of the Endpoint change.
1. Any other operator subscribed to Endpoint is notified too.

Such a long list for what is surprisingly a common task — creating a Pod.

The Pod is _Running_, it is time to discuss what happens when you delete it.

## Deleting a Pod

You might have guessed it already, when the Pod is deleted, you have to follow the same steps but in reverse.

First, the endpoint should be removed from the Endpoint (object).

That in turn fires off all the events to kube-proxy, Ingress controller, DNS, service mesh, etc.

Those components will update their internal state and stop routing traffic to their IP address.

Since the components might be busy doing something else, there is no guarantee on how long it will take for all of them to remove the IP address from their internal state.

For some it could take less than a second, for others it could take more.

At the same time the status of the Pod in etcd is changed to _Terminating_.

The kubelet is notified of the change and delegates:

1. Unmounting any volumes from the container to the Container Storage Interface (CSI).
1. Deteaching the container from the network to the Container Network Interface (CNI).
1. Destroying the container to the Container Runtime Interface (CRI).

In other words, Kubernetes follows exactly the same steps but in reverse to delete a Pod.

However, there is a subtle but important difference.

When you terminate a Pod, the endpoint and the signal to the kubelet to terminate the Pod are issued at the same time.

Whereas when you create a Pod for the first time Kubernetes wait for the kubelet to report the IP address and then kicks off the endpoint propagation, when you delete a Pod the events happen in parallel.

And this could cause quite a few race conditions.

_What if the Pod is deleted before the endpoint is propagated?_

## Graceful shutdown

When a Pod is terminated before the endpoint is removed from kube-proxy or the Ingress controller, you might experience downtime.

And, if you think about it, it makes sense.

Kubernetes is still routing traffic to the IP address, but the Pod is no longer there.

Ideally, Kubernetes should wait for all components in the cluster to have an updated list of endpoints before the Pod is deleted.

But Kubernetes doesn't work like that.

Kubernetes offers robust primitives to distribute the endpoints (i.e. the Endpoint object).

It does not verify that the component that subscribe to changes to endpoints are up-to-date with the state of the cluster.

So what can you do avoid this race conditions and make sure that the Pod is deleted after the endpoint is propagated?

You should _wait_.

When the Pod is about to be deleted, it receives a SIGTERM signal.

Your application can capture that signal and start shutting down the process.

However, you know already that it's unlikely that the endpoint propagated to all componentes in Kubernetes.

So instead of immediately exiting the process, you could:

1. Still process incoming traffic.
1. Close existing long lived connections (perhaps a database connection or WebSockets).
1. And just generally, wait a bit longer.

_How long?_

By default, Kubernetes will send the SIGTERM signal and wait 30 seconds before killing the process.

So you could use the 30 seconds wisely and prepare for the Pod to shutdown.

If you want to execute a custom script before the SIGTERM is invoked, Kubernetes exposes a `preStop` hook in the Pod.

If you don't have time to refactor your app to work nicely with Kubernetes, you can set the preStop to hook for a fixed amount of time — 10 seconds.
