---
title: pipe-webserver 😀
created-date: Fri Jun  4 19:21:20 WEST 2021
---

# Test

## Table of contents here

<div class="toc"></div>

## Actual content

Let's try to edit this from vim

And then open it in some other browser

![image1](example.png)

- Add some fun features
- A lot of things to do

{!./subfolder/subfile.md!}

> A simple graph

```dot
digraph {
        A -> B -> C
	Service_B -> Service_A
}
```

> How to print the NDJSON message between 2 steps to the terminal

```bash
$ echo "the easiest way to see the messages in-between steps using tee"
$ receiver | favicon | blog | tee /dev/stderr | emitter
```

# Video page

## Embedded video

[youtube video](https://www.youtube.com/watch?v=UrYPbF8_xNk)

```java
class SystemClass {
	public static main(String[]: args){
		System.out.println("Hello World");
	}
}
```

<details>
<summary>Here's some collapsible code hidden...</summary>
<p>

```c#
public class Order
{
    public int OrderId { get; set; }
    public int CustomerId { get; set; }

    public List<int> Products { get; set; }
}
```

</p>
</details>  

{!footer.md!}
