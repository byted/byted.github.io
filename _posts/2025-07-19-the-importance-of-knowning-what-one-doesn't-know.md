---
tags:   github ai-coding cursor.ai
---
<!-- {% raw %} -->
Another day, another AI coding adventure. Today's scenario seemed perfect for the LLM gods: Tweak an existing GitHub Action. Loads of examples on the web, small & self-contained codebase. But it turned out to be surprisingly tricky.

The existing Action had two jobs `foo` and `bar`:
```yaml
...
jobs:
  foo:
    uses: ./.github/workflows/something-important.yml

  bar:
    needs: foo
...
```
In this simple setup `bar` waits for `foo` to finish successfully. If `foo` is never run or doesn't succeed, `bar` is not run. In contrast, the new behavior I needed was
- optionally skip `foo` via an input parameter
- `bar` should run iff `foo` is skipped OR succeeds

Not something I could whip up from the top of my head. Figuring out this one-off task would involve perusing the GitHub docs for a few minutes. So, a chance to accelerate using AI. Here’s how it went.

## The Journey

I put the file containing the action into Cursor's context and started prompting:
> only run job foo when a parameter "skip_foo" is not set or false. It should default to false

produced the following change

```yaml
...
jobs:
  foo:
    uses: ./.github/workflows/something-important.yml
    if: ${{ !inputs.skip_foo }}

  bar:
    needs: foo
...
```

This looked fishy to me. Even though I'm not an expert in GitHub Actions it seems as if  `needs` is not considered. So, let's ask Cursor

> the next job has "needs: foo" will that work?

```yaml
...
jobs:
  foo:
    uses: ./.github/workflows/something-important.yml
    if: ${{ !inputs.skip_foo }}

  bar:
    if: ${{ !inputs.skip_foo || (inputs.skip_foo == true) }}
...
```

Ok, getting rid of `needs` is one option, but this silently switches to run `foo` & `bar` in parallel. OK, rookie prompting mistake. It was disappointing Cursor missed those semantics - but I could’ve been clearer. And on second look: what's that if condition? Let's ask Cursor

> why the or? why not just check if true/false?

This led Cursor into an existential crisis. Re-evaluating its approach it noticed the useless nature of the `if`. The solution? Making it more complex by adding a Gate job pattern:

```yaml
...
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Gate job for dependency management"

  foo:
    needs: gate
    if: ${{ !inputs.skip_foo }}
    uses: ./.github/workflows/something-important.yml

  bar:
    needs: [gate, foo]
    if: ${{ always() && (inputs.skip_foo || needs.foo.result == 'success') }}
...
```

Hidden among the gate job noise is the realization that one can use `always()` and `needs.foo.result` context to modify the `needs` behavior. However, at this point the Cursor agent got stuck and fixated on the gate pattern that was orthogonal to the behavior I want. Let's start over with a fresh session and a more detailed prompt.

> modify this job setup so that
> - foo can be skipped
> - if not skipped make sure the next step only runs once foo is done and successful
> - if skipped, next step should always run

```yaml
...
jobs:
  foo:
    if: ${{ !inputs.skip_foo }}
    uses: ./.github/workflows/something-important.yml

  deployAerostation:
    needs: [foo]
    if: ${{ inputs.skip_foo || (needs.foo.result == 'success') }}
...
```

That's closer but still not functional. After some more unsuccessful back and forth I gave up and manually checked out the GitHub documentation. Funnily enough, during our conversation Cursor cited the GitHub documentation for the [needs context](https://docs.github.com/en/actions/reference/contexts-reference#needs-context) and [`needs` property](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idneeds) so I knew exactly where to look! After a few minutes I arrived at the correct solution

```yaml
...
jobs:
  foo:
    if: ${{ !inputs.skip_foo }}
    uses: ./.github/workflows/something-important.yml

  deployAerostation:
    needs: [foo]
    if: ${{ always() && (needs.foo.result == 'success' || needs.foo.result == 'skipped') }}
...
```

## The Learnings
 
Cursor and I were close but we couldn't get the details right - which was the hard part that I had hoped to solve by using AI here.

Cursor found the correct documentation on its own but was unable to understand it. Explicitly adding documentation to the context would not have been beneficial.

Coding agents' inability to communicate their limitations wastes a lot of time (and might be one of the reasons why using [AI can slow programming down](https://arxiv.org/pdf/2507.09089)). If you're an expert in the area you can quickly recognize the struggles. But if you're an expert then why use AI in the first place? The ability to communicate what one _doesn't_ know is something I value more and more in (human) colleagues. It’s now something I actively screen for in interviews. 
<!-- {% endraw %} -->
