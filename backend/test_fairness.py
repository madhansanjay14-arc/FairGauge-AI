from fairness import calculate_fairness

result = calculate_fairness(
    group_a_total=200,
    group_a_selected=120,
    group_b_total=200,
    group_b_selected=100
)

print("===== FAIRGAUGE AI FAIRNESS REPORT =====")

for key, value in result.items():
    print(f"{key}: {value}")

