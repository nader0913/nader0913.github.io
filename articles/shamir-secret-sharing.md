# Problem

Imagine eleven scientists working on a highly confidential project. They want to keep the documents in a safe cabinet but only accessible when six of them are present. What is the smallest number of locks, and keys each scientist has to carry in order to achieve this?

A conventional solution would involve a system of locks and keys, governed by combinatorial principles.

### Number of Locks

The goal is to ensure that the cabinet can be opened only when at least six scientists are present. The number of locks required is calculated based on the possible combinations of scientists who are not present. Since there are 11 scientists and at least 6 must be present to open the cabinet, the calculation considers the combinations of 5 scientists $(11 - 6 = 5)$ who are absent. The formula represents choosing 5 scientists from 11.

$$
\binom{11}{5} = \frac{11!}{5!(11-5)!} = 462
$$

Each scientist must have a key to every lock that corresponds to a group of 5 scientists that does not include them. Since each scientist is one of the 11, we consider combinations of 5 scientists out of the remaining 10 to be absent along with them.

### Number of Keys per Scientist

$$
\binom{10}{5} = \frac{10!}{5!(10-5)!} = 252
$$

Each of the six scientists will use $\frac{462}{6} = 77$ keys to open the cabinet. These numbers are clearly impractical, and they become exponentially worse when the number of scientists increases.

# Unreliable Solutions

One might consider centralizing the key storage, perhaps in a secure digital format or within a trusted individual's memory. This scheme presents a single point of failure. A computer malfunction or an individual's incapacity could render the key inaccessible. While duplicating the key in multiple locations might seem a solution, it significantly raises the risk of security breaches due to factors like digital intrusion, betrayal, or human error.

# Shamir's Secret Sharing

To address these challenges, Shamir's Secret Sharing offers a robust and decentralized approach. This method involves dividing the data $D$ into $n$ parts ($D_0, D_1, ..., D_n$), in such a way that reconstructing D is straightforward with any $k$ parts, provided $n ≥ k$.

In a $(k, n)$ threshold scheme where $n = 2k-1$, the system is designed with the following characteristics:

1. **Efficiency:** Possessing $k$ or more parts makes $D$ easily computable.
2. **Unresolvable:** Possessing $k-1$ parts or fewer leaves $D$ completely indeterminate.
3. **Resilience to Loss:** The original key can be recovered even if up to $[n/2] = k-1$ parts are lost or destroyed.
4. **Security Against Breaches:** The key remains secure and unreconstructable even if up to $[n/2] = k-1$ parts are exposed due to security breaches.

These properties make Shamir's Secret Sharing an ideal solution for decentralized, robust, and secure storage of sensitive information in collaborative environments like scientific research.

# Example

Consider a company that uses digital signatures for checks, implementing a $(3, n)$ threshold scheme for authentication. Each executive holds a magnetic card containing a piece of the signature key $Di$. The signature device, which itself stores no secrets and is safe from tampering, requires any three cards to temporarily generate the complete signature key $D$ for signing checks. This setup prevents forgery unless three executives collaborate illicitly.

We have to note that the choice of $k$ and $n$ in Shamir Secret Sharing is crucial. We need to ensure that a large enough group can authorize actions, while a significant minority can prevent unauthorized actions.

# Intricacies

The underlying mechanism is Shamir's Secret Sharing, based on the [Lagrange Interpolation Theorem](https://en.wikipedia.org/wiki/Lagrange_polynomial). It states that for $k$ unique points $(xi, yi)$, there's a unique polynomial $q(x)$ of degree $k-1$ that passes through all these points. let number $D$ be our secret, we choose a random polynomial with random coefficients $a_1, ..., a_n$ and $a_0 = D$:

$$
q(x)=a\_0+a\_1 x^1 + ... + a\_{k-1}x^{k-1}
$$

We then evaluate this polynomial at different points to generate the pieces of the secret:

$$
q(1) = D\_1, ..., q(n) = D\_n
$$

To recover $D$, at least $k$ points are needed. Once we possess $k$ points we can construct $q(x)$ and consequently get $D$ by evaluating $q(x)$ at 0 $(q(0) = D)$. We use modular arithmetic, working within a set of integers modulo a prime number $p$ (larger than $D$ and $n$), to ensure secure interpolation. The coefficients $a_0, ..., a_n$ are chosen from a uniform distribution within $[0, p)$. Thus, each $D_i$ is calculated modulo $p$.

With knowledge of only $k-1$ points, pinpointing the correct polynomial is infeasible. For every potential value $D'$ in $[0, p)$, a corresponding unique polynomial $q'(x)$ exists such that $q'(0) = D'$. As all these polynomials are equally probable, possessing less than $k$ points leaves the adversary with no advantage, maintaining the secrecy of $D$.

# Shamir Secret Sharing Advantages

This $(k, n)$ threshold scheme offers several advantages over other key sharing alternatives:

1. **Size Efficiency:** Each piece of the scheme is no larger than the original data.
2. **Dynamic Management:** When $k$ is constant, it's possible to add or remove pieces (as executives join or leave a company) without impacting the remaining pieces. We can create new keys by evaluating $q(x)$ at new points, e.g. $q(n+1)$. A piece is only deleted if it becomes completely inaccessible.
3. **Ease of Modification:** Changing the pieces $D_i$ without altering the original data $D$ is straightforward. This is achieved by selecting a new polynomial $q(x)$ with the same constant term. Regular updates of this kind significantly boost security, as exposed pieces from security breaches become useless unless they all come from the same version of $q(x)$.
4. **Hierarchical Flexibility:** By assigning multiple values of $q(x)$ to different roles, a layered access scheme can be created. For example, giving the company president three values of $q(x)$, each vice-president two, and every executive one, enables a flexible authorization system. This allows for various combinations of executives to authorize actions, such as any three executives, two executives including at least one vice-president, or the president alone, to sign checks under a $(3, n)$ threshold scheme.

# Final Thoughts

In summary, Shamir's Secret Sharing stands out for its practicality and security in key management. It elegantly addresses dynamic environments and hierarchical access needs, proving to be a versatile and robust choice for protecting sensitive data in various organizational contexts.